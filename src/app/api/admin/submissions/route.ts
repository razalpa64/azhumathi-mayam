import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiStaff, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { resolveCourseAudienceSpecialization } from '@/lib/subject-siblings';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';
import { sendPushToUsers } from '@/lib/push';

const SUBMISSION_SELECT = `
  *,
  student:profiles!student_id(id, full_name, username),
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name)
`;

const moderateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  admin_note: z.string().trim().max(500).optional().nullable(),
});

/** The moderation queue (defaults to pending, oldest first). */
export async function GET(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const status = request.nextUrl.searchParams.get('status') || 'pending';
  const adminClient = createSupabaseAdminClient();

  let query = adminClient
    .from('material_submissions')
    .select(SUBMISSION_SELECT)
    .order('created_at', { ascending: true })
    .limit(100);
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not load the upload queue.', 'admin') },
      { status: 400 }
    );
  }
  return NextResponse.json({ items: data || [] });
}

/**
 * Approve → the submission becomes a published resource, credited to
 * the student (uploaded_by), with taxonomy derived from the subject —
 * exactly like an admin upload. Reject → status only.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = moderateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid moderation request.' },
      { status: 400 }
    );
  }
  const { id, action, admin_note } = parsed.data;
  const adminClient = createSupabaseAdminClient();

  const { data: submission } = await adminClient
    .from('material_submissions')
    .select('*, subject:subjects(id, subject_code, name)')
    .eq('id', id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: 'That upload was not found.' }, { status: 404 });
  }
  if (submission.status !== 'pending') {
    return NextResponse.json(
      { error: 'That upload has already been reviewed.' },
      { status: 409 }
    );
  }

  const reviewedAt = new Date().toISOString();

  if (action === 'reject') {
    const { error } = await adminClient
      .from('material_submissions')
      .update({
        status: 'rejected',
        admin_note: admin_note || null,
        reviewed_by: auth.profile.id,
        reviewed_at: reviewedAt,
      })
      .eq('id', id);
    if (error) {
      return NextResponse.json(
        { error: friendlyDbError(error, 'Could not reject that upload.', 'admin') },
        { status: 400 }
      );
    }
    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: 'SUBMISSION_REJECTED',
      entityType: 'material_submission',
      entityId: id,
      summary: `Rejected student upload "${submission.title}"`,
    });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // ---- Approve -------------------------------------------------------
  // Re-validate the stored Drive link before publishing it.
  const linkCheck = storageProvider.parseAndValidateUrl(
    submission.google_drive_share_url as string
  );
  if (!linkCheck.valid || !linkCheck.fileId || !linkCheck.normalizedShareUrl) {
    return NextResponse.json(
      {
        error:
          'The Drive link on this upload no longer validates. Reject it and ask the student to share the link again.',
      },
      { status: 400 }
    );
  }

  // Taxonomy comes from the subject row, never from the submission —
  // the same rule the admin upload follows.
  const { data: subject } = await adminClient
    .from('subjects')
    .select('id, programme_id, semester_id, regulation_id, university_id')
    .eq('id', submission.subject_id)
    .maybeSingle();
  if (!subject) {
    return NextResponse.json(
      { error: 'The subject for this upload no longer exists.' },
      { status: 400 }
    );
  }

  let categoryId = submission.category_id as string | null;
  if (!categoryId) {
    const { data: fallback } = await adminClient
      .from('resource_categories')
      .select('id')
      .eq('slug', 'lecture-notes')
      .maybeSingle();
    categoryId = fallback?.id || null;
  }
  if (!categoryId) {
    return NextResponse.json(
      { error: 'No resource category available for this upload.' },
      { status: 400 }
    );
  }

  const audienceSpecializationId = await resolveCourseAudienceSpecialization(
    adminClient,
    submission.subject_id as string
  );

  const { data: resource, error: insertError } = await adminClient
    .from('resources')
    .insert({
      title: submission.title,
      description: submission.description || null,
      university_id: subject.university_id || null,
      programme_id: subject.programme_id,
      specialization_id: audienceSpecializationId,
      regulation_id: subject.regulation_id || null,
      semester_id: subject.semester_id,
      subject_id: submission.subject_id,
      category_id: categoryId,
      keywords: [],
      storage_provider: storageProvider.id,
      google_drive_file_id: linkCheck.fileId,
      google_drive_share_url: linkCheck.normalizedShareUrl,
      file_type: submission.file_type,
      publication_status: 'published',
      uploaded_by: submission.student_id,
    })
    .select('id')
    .single();

  if (insertError || !resource) {
    return NextResponse.json(
      {
        error: friendlyDbError(
          insertError,
          'Approving failed while publishing the material. Please try again.',
          'admin'
        ),
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await adminClient
    .from('material_submissions')
    .update({
      status: 'approved',
      admin_note: admin_note || null,
      created_resource_id: resource.id,
      reviewed_by: auth.profile.id,
      reviewed_at: reviewedAt,
    })
    .eq('id', id);

  if (updateError) {
    // The resource is published; don't lose track of it — surface the
    // problem instead of pretending the approval failed.
    return NextResponse.json(
      {
        error:
          'The material was published, but marking the upload as approved failed. Check Study Materials, then refresh this queue.',
      },
      { status: 500 }
    );
  }

  // Tell the contributor — in-app notification + web push, best-effort.
  try {
    await adminClient.from('notifications').insert({
      user_id: submission.student_id,
      resource_id: resource.id,
      title: 'Your upload was approved 🎉',
      message: `"${submission.title}" is now live for students. Thank you for contributing!`,
      notification_type: 'resource',
      link_url: `/resources/${resource.id}`,
    });
    await sendPushToUsers(adminClient, [submission.student_id as string], {
      title: 'Your upload was approved 🎉',
      body: `"${submission.title}" is now live on Azhimathi Mayam.`,
      url: `/resources/${resource.id}`,
    });
  } catch {
    // Notifications are a bonus; the approval itself already succeeded.
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'SUBMISSION_APPROVED',
    entityType: 'material_submission',
    entityId: id,
    summary: `Approved student upload "${submission.title}" (published as resource ${resource.id})`,
  });

  return NextResponse.json({ ok: true, status: 'approved', resourceId: resource.id });
}
