import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiStaff, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';

const updateResourceSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  university_id: z.string().uuid().nullable().optional(),
  programme_id: z.string().uuid().optional(),
  specialization_id: z.string().uuid().nullable().optional(),
  regulation_id: z.string().uuid().nullable().optional(),
  semester_id: z.string().uuid().optional(),
  subject_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  academic_year: z.string().trim().max(40).nullable().optional(),
  keywords: z.array(z.string().trim().max(50)).max(25).optional(),
  google_drive_share_url: z.string().trim().min(1).max(1024).optional(),
  file_name: z.string().trim().max(255).nullable().optional(),
  file_type: z
    .enum(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'ZIP', 'OTHER'])
    .optional(),
  file_size: z.string().trim().max(40).nullable().optional(),
  publication_status: z.enum(['draft', 'published']).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid update payload.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { data: existing } = await adminClient
    .from('resources')
    .select('id, title, google_drive_file_id, publication_status')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const payload = parsed.data;

  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description || null;
  if (payload.university_id !== undefined) updates.university_id = payload.university_id;
  if (payload.programme_id !== undefined) updates.programme_id = payload.programme_id;
  if (payload.specialization_id !== undefined) updates.specialization_id = payload.specialization_id;
  if (payload.regulation_id !== undefined) updates.regulation_id = payload.regulation_id;
  if (payload.semester_id !== undefined) updates.semester_id = payload.semester_id;
  if (payload.subject_id !== undefined) updates.subject_id = payload.subject_id;
  if (payload.category_id !== undefined) updates.category_id = payload.category_id;
  if (payload.academic_year !== undefined) updates.academic_year = payload.academic_year || null;
  if (payload.keywords !== undefined) {
    updates.keywords = Array.from(
      new Set(payload.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))
    );
  }
  if (payload.file_name !== undefined) updates.file_name = payload.file_name || null;
  if (payload.file_type !== undefined) updates.file_type = payload.file_type;
  if (payload.file_size !== undefined) updates.file_size = payload.file_size || null;
  if (payload.publication_status !== undefined) updates.publication_status = payload.publication_status;

  let linkReplaced = false;
  if (payload.google_drive_share_url !== undefined) {
    const linkCheck = storageProvider.parseAndValidateUrl(payload.google_drive_share_url);
    if (!linkCheck.valid || !linkCheck.fileId || !linkCheck.normalizedShareUrl) {
      return NextResponse.json(
        { error: linkCheck.error || 'Invalid replacement Google Drive link.' },
        { status: 400 }
      );
    }
    linkReplaced = linkCheck.fileId !== existing.google_drive_file_id;
    updates.google_drive_file_id = linkCheck.fileId;
    updates.google_drive_share_url = linkCheck.normalizedShareUrl;
  }

  const { data: updated, error } = await adminClient
    .from('resources')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'That resource operation failed. Please try again.', 'admin') }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: linkReplaced ? 'RESOURCE_REPLACED' : 'RESOURCE_UPDATED',
    entityType: 'resource',
    entityId: id,
    summary: linkReplaced
      ? `Replaced Google Drive link on "${updated.title}" (original Drive file untouched).`
      : `Updated resource "${updated.title}".`,
    metadata: {
      previousFileId: existing.google_drive_file_id,
      newFileId: updated.google_drive_file_id,
      publicationStatus: updated.publication_status,
    },
  });

  return NextResponse.json({ ok: true, resource: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const adminClient = createSupabaseAdminClient();

  const { data: existing } = await adminClient
    .from('resources')
    .select('id, title, google_drive_file_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
  }

  // Deletes database record only; original Google Drive document remains intact
  const { error } = await adminClient.from('resources').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'That resource operation failed. Please try again.', 'admin') }, { status: 400 });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'RESOURCE_DELETED',
    entityType: 'resource',
    entityId: id,
    summary: `Removed resource record "${existing.title}" from platform (Google Drive document preserved).`,
    metadata: { fileId: existing.google_drive_file_id },
  });

  return NextResponse.json({ ok: true });
}
