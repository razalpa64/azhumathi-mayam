import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeUsername, usernameToAuthEmail, validateUsernameFormat } from '@/lib/auth/username';

const createStudentSchema = z.object({
  username: z.string().min(3).max(64),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters.').max(128),
  full_name: z.string().trim().min(2, 'Student full name is required.').max(100),
  university_id: z.string().uuid().nullable().optional(),
  programme_id: z.string().uuid().nullable().optional(),
  specialization_id: z.string().uuid().nullable().optional(),
  regulation_id: z.string().uuid().nullable().optional(),
  semester_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

const STUDENT_SELECT = `
  *,
  university:universities(id, short_name, name),
  programme:programmes(id, code, name),
  specialization:specializations(id, code, name),
  regulation:academic_regulations(id, code, name),
  semester:semesters(id, semester_number, label)
`;

export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const adminClient = createSupabaseAdminClient();
  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') || '').replace(/[,%()'"\\]/g, ' ').trim();
  const programmeId = sp.get('programmeId') || '';
  const semesterId = sp.get('semesterId') || '';
  const status = sp.get('status') || '';
  const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(sp.get('pageSize') || '20', 10) || 20));

  let query = adminClient
    .from('profiles')
    .select(STUDENT_SELECT, { count: 'exact' })
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (programmeId) query = query.eq('programme_id', programmeId);
  if (semesterId) query = query.eq('semester_id', semesterId);
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: items, count, error } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'That student operation failed. Please try again.', 'admin') }, { status: 400 });
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
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid student account data.' },
      { status: 400 }
    );
  }

  const usernameCheck = validateUsernameFormat(parsed.data.username);
  if (!usernameCheck.valid) {
    return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  if (normalizedUsername === 'admin@invytra') {
    return NextResponse.json(
      { error: 'Username admin@invytra is reserved for the Super Administrator.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { data: duplicate } = await adminClient
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      { error: `Username "${normalizedUsername}" is already assigned to another user.` },
      { status: 409 }
    );
  }

  const authEmail = usernameToAuthEmail(normalizedUsername);
  const { data: authCreated, error: authErr } = await adminClient.auth.admin.createUser({
    email: authEmail,
    password: parsed.data.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      username: normalizedUsername,
      full_name: parsed.data.full_name,
      role: 'student',
    },
  });

  if (authErr || !authCreated.user) {
    return NextResponse.json(
      { error: authErr?.message || 'Failed to provision authentication account.' },
      { status: 400 }
    );
  }

  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .insert({
      id: authCreated.user.id,
      username: normalizedUsername,
      auth_email: authEmail,
      full_name: parsed.data.full_name,
      role: 'student',
      university_id: parsed.data.university_id || null,
      programme_id: parsed.data.programme_id || null,
      specialization_id: parsed.data.specialization_id || null,
      regulation_id: parsed.data.regulation_id || null,
      semester_id: parsed.data.semester_id || null,
      is_active: parsed.data.is_active,
      must_change_password: true,
    })
    .select(STUDENT_SELECT)
    .single();

  if (profileErr || !profile) {
    // Rollback auth user if profile insert failed
    await adminClient.auth.admin.deleteUser(authCreated.user.id);
    return NextResponse.json(
      { error: profileErr?.message || 'Failed to create student profile.' },
      { status: 400 }
    );
  }

  await adminClient.from('notifications').insert({
    user_id: profile.id,
    title: 'Welcome to അഴിമതി മയം',
    message:
      'Your student account is ready. You can update your password anytime from Account Settings.',
    notification_type: 'account',
    link_url: '/dashboard/settings',
  });

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'STUDENT_CREATED',
    entityType: 'profile',
    entityId: profile.id,
    summary: `Created student account "${normalizedUsername}" (${parsed.data.full_name}).`,
    metadata: {
      username: normalizedUsername,
      programmeId: parsed.data.programme_id || null,
      semesterId: parsed.data.semester_id || null,
    },
  });

  return NextResponse.json({ ok: true, student: profile }, { status: 201 });
}
