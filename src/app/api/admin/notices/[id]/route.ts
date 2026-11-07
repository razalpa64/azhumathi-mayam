import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSafeExternalUrl } from '@/lib/utils';

const updateNoticeSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(2).max(4000).optional(),
  notice_type: z
    .enum(['general', 'exam', 'assignment', 'academic_update', 'material_update', 'college'])
    .optional(),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  is_pinned: z.boolean().optional(),
  attachment_url: z.string().trim().max(1024).nullable().optional(),
  attachment_type: z.enum(['image', 'pdf', 'drive']).nullable().optional(),
  attachment_name: z.string().trim().max(255).nullable().optional(),
  external_link: z.string().trim().max(1024).nullable().optional(),
  external_link_label: z.string().trim().max(80).nullable().optional(),
  target_programme_id: z.string().uuid().nullable().optional(),
  publication_status: z.enum(['draft', 'published']).optional(),
  start_date: z.string().optional(),
  expiry_date: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateNoticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid notice update.' },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.external_link && !isValidSafeExternalUrl(payload.external_link)) {
    return NextResponse.json({ error: 'Invalid external link URL.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...payload };
  if (payload.start_date) updates.start_date = new Date(payload.start_date).toISOString();
  if (payload.expiry_date !== undefined) {
    updates.expiry_date = payload.expiry_date ? new Date(payload.expiry_date).toISOString() : null;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: updated, error } = await adminClient
    .from('notices')
    .update(updates)
    .eq('id', id)
    .select('*, target_programme:programmes(id, code, name)')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Failed to update notice.' }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'NOTICE_UPDATED',
    entityType: 'notice',
    entityId: id,
    summary: `Updated notice "${updated.title}".`,
  });

  return NextResponse.json({ ok: true, notice: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const adminClient = createSupabaseAdminClient();
  const { data: existing } = await adminClient
    .from('notices')
    .select('title')
    .eq('id', id)
    .maybeSingle();

  const { error } = await adminClient.from('notices').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'That notice operation failed. Please try again.', 'admin') }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'NOTICE_DELETED',
    entityType: 'notice',
    entityId: id,
    summary: `Deleted notice "${existing?.title || id}".`,
  });

  return NextResponse.json({ ok: true });
}
