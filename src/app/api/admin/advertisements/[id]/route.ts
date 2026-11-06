import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSafeExternalUrl } from '@/lib/utils';

const updateAdSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  placement: z
    .enum([
      'homepage_banner',
      'between_listings',
      'subject_page',
      'below_pdf_preview',
      'dedicated_partner_section',
    ])
    .optional(),
  provider_type: z.enum(['custom_sponsor', 'adsense_slot']).optional(),
  sponsor_name: z.string().trim().max(100).nullable().optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  body_text: z.string().trim().max(400).nullable().optional(),
  cta_label: z.string().trim().max(50).nullable().optional(),
  target_url: z.string().trim().max(1024).nullable().optional(),
  image_url: z.string().trim().max(1024).nullable().optional(),
  adsense_client_id: z.string().trim().max(80).nullable().optional(),
  adsense_slot_id: z.string().trim().max(80).nullable().optional(),
  is_enabled: z.boolean().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateAdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid advertisement update.' },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.target_url && !isValidSafeExternalUrl(payload.target_url)) {
    return NextResponse.json({ error: 'Invalid destination URL.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...payload };
  if (payload.start_date !== undefined) {
    updates.start_date = payload.start_date ? new Date(payload.start_date).toISOString() : null;
  }
  if (payload.end_date !== undefined) {
    updates.end_date = payload.end_date ? new Date(payload.end_date).toISOString() : null;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: updated, error } = await adminClient
    .from('advertisements')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Failed to update placement.' }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'AD_UPDATED',
    entityType: 'advertisement',
    entityId: id,
    summary: `Updated advertisement placement "${updated.name}" (${updated.is_enabled ? 'Enabled' : 'Disabled'}).`,
  });

  return NextResponse.json({ ok: true, advertisement: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from('advertisements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'AD_DELETED',
    entityType: 'advertisement',
    entityId: id,
    summary: `Deleted advertisement placement (${id}).`,
  });

  return NextResponse.json({ ok: true });
}
