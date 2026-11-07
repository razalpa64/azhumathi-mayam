import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { isValidSafeExternalUrl } from '@/lib/utils';

const noticeSchema = z.object({
  title: z.string().trim().min(2, 'Notice title is required.').max(200),
  description: z.string().trim().min(2, 'Notice description is required.').max(4000),
  notice_type: z
    .enum(['general', 'exam', 'assignment', 'academic_update', 'material_update', 'college'])
    .default('general'),
  priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
  is_pinned: z.boolean().default(false),
  attachment_url: z.string().trim().max(1024).nullable().optional(),
  attachment_type: z.enum(['image', 'pdf', 'drive']).nullable().optional(),
  attachment_name: z.string().trim().max(255).nullable().optional(),
  external_link: z.string().trim().max(1024).nullable().optional(),
  external_link_label: z.string().trim().max(80).nullable().optional(),
  target_programme_id: z.string().uuid().nullable().optional(),
  publication_status: z.enum(['draft', 'published']).default('published'),
  start_date: z.string().optional(),
  expiry_date: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('notices')
    .select('*, target_programme:programmes(id, code, name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'That notice operation failed. Please try again.', 'admin') }, { status: 400 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = noticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid notice payload.' },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.external_link && !isValidSafeExternalUrl(payload.external_link)) {
    return NextResponse.json(
      { error: 'External link must be a valid https:// or http:// URL.' },
      { status: 400 }
    );
  }
  if (payload.attachment_url && !isValidSafeExternalUrl(payload.attachment_url)) {
    return NextResponse.json({ error: 'Attachment URL is invalid.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const startDate = payload.start_date ? new Date(payload.start_date).toISOString() : new Date().toISOString();
  const expiryDate = payload.expiry_date ? new Date(payload.expiry_date).toISOString() : null;

  const { data: created, error } = await adminClient
    .from('notices')
    .insert({
      title: payload.title,
      description: payload.description,
      notice_type: payload.notice_type,
      priority: payload.priority,
      is_pinned: payload.is_pinned,
      attachment_url: payload.attachment_url || null,
      attachment_type: payload.attachment_url ? payload.attachment_type || 'drive' : null,
      attachment_name: payload.attachment_name || null,
      external_link: payload.external_link || null,
      external_link_label: payload.external_link_label || null,
      target_programme_id: payload.target_programme_id || null,
      publication_status: payload.publication_status,
      start_date: startDate,
      expiry_date: expiryDate,
      created_by: auth.profile.id,
    })
    .select('*, target_programme:programmes(id, code, name)')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Failed to publish notice.' }, { status: 400 });
  }

  // Push notification to active students when published
  if (payload.publication_status === 'published') {
    const buildStudentQuery = () => {
      let studentQuery = adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('id');

      if (payload.target_programme_id) {
        studentQuery = studentQuery.eq('programme_id', payload.target_programme_id);
      }
      return studentQuery;
    };

    // Page through every matching student — a flat .limit() here
    // silently un-notified everyone past the cap.
    const students = await fetchAllRows(
      async (from, to) => buildStudentQuery().range(from, to),
      500
    );
    for (let i = 0; i < students.length; i += 500) {
      const notifications = students.slice(i, i + 500).map((s) => ({
        user_id: s.id,
        notice_id: created.id,
        title: payload.title,
        message: payload.description.slice(0, 180),
        notification_type: 'notice',
        link_url: '/dashboard/notifications',
      }));
      await adminClient.from('notifications').insert(notifications);
    }
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'NOTICE_PUBLISHED',
    entityType: 'notice',
    entityId: created.id,
    summary: `Created ${payload.publication_status} notice "${created.title}".`,
    metadata: { priority: payload.priority, isPinned: payload.is_pinned },
  });

  return NextResponse.json({ ok: true, notice: created }, { status: 201 });
}
