import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sanitizeSpecializationId } from '@/lib/programme-branches-server';

const updateStudentSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  university_id: z.string().uuid().nullable().optional(),
  programme_id: z.string().uuid().nullable().optional(),
  specialization_id: z.string().uuid().nullable().optional(),
  regulation_id: z.string().uuid().nullable().optional(),
  semester_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(128).optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const adminClient = createSupabaseAdminClient();

  const [profileRes, downloadsRes, bookmarksRes, recentRes] = await Promise.all([
    adminClient
      .from('profiles')
      .select(
        `*, university:universities(id, short_name, name), programme:programmes(id, code, name), specialization:specializations(id, code, name), regulation:academic_regulations(id, code, name), semester:semesters(id, semester_number, label)`
      )
      .eq('id', id)
      .eq('role', 'student')
      .maybeSingle(),
    adminClient
      .from('downloads')
      .select('id, created_at, resource:resources(id, title)', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),
    adminClient
      .from('recently_viewed')
      .select('id, viewed_at, resource:resources(id, title)')
      .eq('user_id', id)
      .order('viewed_at', { ascending: false })
      .limit(8),
  ]);

  if (!profileRes.data) {
    return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
  }

  return NextResponse.json({
    student: profileRes.data,
    downloadCount: downloadsRes.count || 0,
    bookmarkCount: bookmarksRes.count || 0,
    recentDownloads: downloadsRes.data || [],
    recentlyViewed: recentRes.data || [],
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid student update.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id, username, full_name, role, is_active, programme_id, specialization_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.role !== 'student') {
    return NextResponse.json({ error: 'Student account not found.' }, { status: 404 });
  }

  const payload = parsed.data;

  // Handle password reset if requested
  if (payload.newPassword) {
    const { error: pwErr } = await adminClient.auth.admin.updateUserById(id, {
      password: payload.newPassword,
    });
    if (pwErr) {
      return NextResponse.json({ error: pwErr.message || 'Password reset failed.' }, { status: 400 });
    }
    await adminClient
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', id);

    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: 'STUDENT_PASSWORD_RESET',
      entityType: 'profile',
      entityId: id,
      summary: `Reset password for student "${existing.username}".`,
    });
  }

  const profileUpdates: Record<string, unknown> = {};
  if (payload.full_name !== undefined) profileUpdates.full_name = payload.full_name;
  if (payload.university_id !== undefined) profileUpdates.university_id = payload.university_id;
  if (payload.programme_id !== undefined) profileUpdates.programme_id = payload.programme_id;
  if (payload.specialization_id !== undefined || payload.programme_id !== undefined) {
    // Changing the programme drops the old branch; a degree with no branches
    // (BBA, BCA, LLB, …) can never keep one.
    const effectiveProgrammeId =
      payload.programme_id !== undefined ? payload.programme_id : (existing.programme_id as string | null);
    const requestedSpecId =
      payload.specialization_id !== undefined
        ? payload.specialization_id
        : payload.programme_id !== undefined
          ? null
          : undefined;
    profileUpdates.specialization_id = await sanitizeSpecializationId(
      adminClient,
      effectiveProgrammeId,
      requestedSpecId
    );
  }
  if (payload.regulation_id !== undefined) profileUpdates.regulation_id = payload.regulation_id;
  if (payload.semester_id !== undefined) profileUpdates.semester_id = payload.semester_id;
  if (payload.is_active !== undefined) profileUpdates.is_active = payload.is_active;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await adminClient.from('profiles').update(profileUpdates).eq('id', id);
    if (error) {
      return NextResponse.json({ error: friendlyDbError(error, 'That student operation failed. Please try again.', 'admin') }, { status: 400 });
    }

    const statusChanged =
      payload.is_active !== undefined && payload.is_active !== existing.is_active;

    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: statusChanged ? 'STUDENT_STATUS_CHANGED' : 'STUDENT_UPDATED',
      entityType: 'profile',
      entityId: id,
      summary: statusChanged
        ? `${payload.is_active ? 'Activated' : 'Deactivated'} student account "${existing.username}".`
        : `Updated profile details for student "${existing.username}".`,
      metadata: profileUpdates,
    });
  }

  return NextResponse.json({ ok: true });
}
