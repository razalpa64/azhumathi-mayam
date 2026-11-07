import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSafeExternalUrl } from '@/lib/utils';

const adSchema = z.object({
  name: z.string().trim().min(2, 'Placement name is required.').max(120),
  placement: z.enum([
    'homepage_banner',
    'between_listings',
    'subject_page',
    'below_pdf_preview',
    'dedicated_partner_section',
  ]),
  provider_type: z.enum(['custom_sponsor', 'adsense_slot']).default('custom_sponsor'),
  sponsor_name: z.string().trim().max(100).nullable().optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  body_text: z.string().trim().max(400).nullable().optional(),
  cta_label: z.string().trim().max(50).nullable().optional(),
  target_url: z.string().trim().max(1024).nullable().optional(),
  image_url: z.string().trim().max(1024).nullable().optional(),
  adsense_client_id: z.string().trim().max(80).nullable().optional(),
  adsense_slot_id: z.string().trim().max(80).nullable().optional(),
  is_enabled: z.boolean().default(false),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('advertisements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: friendlyDbError(error, 'That advertisement operation failed. Please try again.', 'admin') }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = adSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid advertisement configuration.' },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.target_url && !isValidSafeExternalUrl(payload.target_url)) {
    return NextResponse.json(
      { error: 'Destination URL must be a valid https:// or http:// link.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { data: created, error } = await adminClient
    .from('advertisements')
    .insert({
      name: payload.name,
      placement: payload.placement,
      provider_type: payload.provider_type,
      sponsor_name: payload.sponsor_name || null,
      headline: payload.headline || null,
      body_text: payload.body_text || null,
      cta_label: payload.cta_label || null,
      target_url: payload.target_url || null,
      image_url: payload.image_url || null,
      adsense_client_id: payload.adsense_client_id || null,
      adsense_slot_id: payload.adsense_slot_id || null,
      is_enabled: payload.is_enabled,
      start_date: payload.start_date ? new Date(payload.start_date).toISOString() : null,
      end_date: payload.end_date ? new Date(payload.end_date).toISOString() : null,
    })
    .select('*')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Failed to create placement.' }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'AD_CREATED',
    entityType: 'advertisement',
    entityId: created.id,
    summary: `Configured advertisement placement "${created.name}" (${created.placement}).`,
  });

  return NextResponse.json({ ok: true, advertisement: created }, { status: 201 });
}
