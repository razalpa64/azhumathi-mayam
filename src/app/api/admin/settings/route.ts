import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, getWebsiteSettings, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const settingsSchema = z.object({
  notices_enabled: z.boolean().optional(),
  ads_enabled: z.boolean().optional(),
  adsense_publisher_id: z.string().trim().max(80).nullable().optional(),
  require_ad_consent: z.boolean().optional(),
  allow_cross_programme_browsing: z.boolean().optional(),
  support_email: z.string().trim().max(120).nullable().optional(),
});

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const settings = await getWebsiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid settings update.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const updates = {
    ...parsed.data,
    updated_by: auth.profile.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await adminClient
    .from('website_settings')
    .update(updates)
    .eq('id', 1)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'Saving settings failed. Please try again.', 'admin') }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'SETTINGS_UPDATED',
    entityType: 'website_settings',
    entityId: '1',
    summary: 'Updated global platform configuration settings.',
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true, settings: updated });
}
