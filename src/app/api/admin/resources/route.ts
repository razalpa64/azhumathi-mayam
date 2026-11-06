import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';

const createResourceSchema = z.object({
  title: z.string().trim().min(2, 'Resource title is required.').max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  university_id: z.string().uuid().nullable().optional(),
  programme_id: z.string().uuid('Please select a degree programme.'),
  specialization_id: z.string().uuid().nullable().optional(),
  regulation_id: z.string().uuid().nullable().optional(),
  semester_id: z.string().uuid('Please select a semester.'),
  subject_id: z.string().uuid('Please select a subject.'),
  category_id: z.string().uuid('Please select a resource category.'),
  academic_year: z.string().trim().max(40).nullable().optional(),
  keywords: z.array(z.string().trim().max(50)).max(25).optional().default([]),
  google_drive_share_url: z.string().trim().min(1, 'Google Drive sharing URL is required.').max(1024),
  file_name: z.string().trim().max(255).nullable().optional(),
  file_type: z
    .enum(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'ZIP', 'OTHER'])
    .default('PDF'),
  file_size: z.string().trim().max(40).nullable().optional(),
  publication_status: z.enum(['draft', 'published']).default('draft'),
});

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['publish', 'unpublish', 'delete']),
});

const ADMIN_RESOURCE_SELECT = `
  *,
  programme:programmes(id, code, name),
  specialization:specializations(id, code, name),
  semester:semesters(id, semester_number, label),
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name, slug),
  university:universities(id, short_name, name),
  regulation:academic_regulations(id, code, name)
`;

export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const adminClient = createSupabaseAdminClient();
  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') || '').replace(/[,%()'"\\]/g, ' ').trim();
  const status = sp.get('status') || '';
  const programmeId = sp.get('programmeId') || '';
  const semesterId = sp.get('semesterId') || '';
  const subjectId = sp.get('subjectId') || '';
  const categoryId = sp.get('categoryId') || '';
  const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(sp.get('pageSize') || '20', 10) || 20));

  let query = adminClient
    .from('resources')
    .select(ADMIN_RESOURCE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status === 'published' || status === 'draft') query = query.eq('publication_status', status);
  if (programmeId) query = query.eq('programme_id', programmeId);
  if (semesterId) query = query.eq('semester_id', semesterId);
  if (subjectId) query = query.eq('subject_id', subjectId);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,file_name.ilike.%${q}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: items, count, error } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const total = count || 0;
  return NextResponse.json({
    items: items || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid resource submission.' },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // Server-side Google Drive URL & File ID validation
  const linkCheck = storageProvider.parseAndValidateUrl(payload.google_drive_share_url);
  if (!linkCheck.valid || !linkCheck.fileId || !linkCheck.normalizedShareUrl) {
    return NextResponse.json(
      { error: linkCheck.error || 'Invalid Google Drive sharing URL.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const normalizedKeywords = Array.from(
    new Set(
      payload.keywords
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0)
    )
  );

  const { data: created, error } = await adminClient
    .from('resources')
    .insert({
      title: payload.title,
      description: payload.description || null,
      university_id: payload.university_id || null,
      programme_id: payload.programme_id,
      specialization_id: payload.specialization_id || null,
      regulation_id: payload.regulation_id || null,
      semester_id: payload.semester_id,
      subject_id: payload.subject_id,
      category_id: payload.category_id,
      academic_year: payload.academic_year || null,
      keywords: normalizedKeywords,
      storage_provider: storageProvider.id,
      google_drive_file_id: linkCheck.fileId,
      google_drive_share_url: linkCheck.normalizedShareUrl,
      file_name: payload.file_name || null,
      file_type: payload.file_type,
      file_size: payload.file_size || null,
      publication_status: payload.publication_status,
      uploaded_by: auth.profile.id,
    })
    .select(ADMIN_RESOURCE_SELECT)
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save resource record.' },
      { status: 400 }
    );
  }

  // Notify matching enrolled students when published
  if (payload.publication_status === 'published') {
    let studentQuery = adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .eq('is_active', true)
      .eq('programme_id', payload.programme_id)
      .eq('semester_id', payload.semester_id);

    if (payload.specialization_id) {
      studentQuery = studentQuery.eq('specialization_id', payload.specialization_id);
    }

    const { data: targetStudents } = await studentQuery.limit(500);
    if (targetStudents && targetStudents.length > 0) {
      const notifications = targetStudents.map((s) => ({
        user_id: s.id,
        resource_id: created.id,
        title: 'New Study Material Published',
        message: `${created.title} has been added for your semester.`,
        notification_type: 'resource',
        link_url: `/resources/${created.id}`,
      }));
      await adminClient.from('notifications').insert(notifications);
    }
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'RESOURCE_UPLOADED',
    entityType: 'resource',
    entityId: created.id,
    summary: `Added resource "${created.title}" (${payload.publication_status}).`,
    metadata: {
      fileId: linkCheck.fileId,
      fileType: payload.file_type,
      status: payload.publication_status,
    },
  });

  return NextResponse.json({ ok: true, resource: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid bulk request.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { ids, action } = parsed.data;

  if (action === 'delete') {
    const { error } = await adminClient.from('resources').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: 'RESOURCE_DELETED_BULK',
      entityType: 'resource',
      summary: `Removed ${ids.length} resource database record(s).`,
      metadata: { count: ids.length, ids },
    });
    return NextResponse.json({ ok: true });
  }

  const nextStatus = action === 'publish' ? 'published' : 'draft';
  const { error } = await adminClient
    .from('resources')
    .update({ publication_status: nextStatus })
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'RESOURCE_STATUS_BULK',
    entityType: 'resource',
    summary: `Updated ${ids.length} resource(s) to ${nextStatus}.`,
    metadata: { count: ids.length, status: nextStatus },
  });

  return NextResponse.json({ ok: true });
}
