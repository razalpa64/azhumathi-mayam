import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeUsername, usernameToAuthEmail, validateUsernameFormat } from '@/lib/auth/username';

/**
 * Sub-admin (content manager) accounts.
 *
 * Super-admin only: every handler here requires role 'admin'.
 * Sub-admins themselves can never reach this API — they cannot see,
 * create, or modify any account, including their own beyond their
 * password (which they change via /api/auth/password).
 */

const SUB_ADMIN_SELECT =
  'id, username, full_name, role, is_active, must_change_password, last_login_at, created_at, created_by';

const RESERVED_USERNAMES = new Set(['admin@invytra', 'admin', 'superadmin', 'support', 'help']);

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .select(SUB_ADMIN_SELECT)
    .eq('role', 'sub_admin')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not load sub-admin accounts. Please try again.', 'admin') },
      { status: 400 }
    );
  }

  return NextResponse.json({ items: data || [] });
}

const createSubAdminSchema = z.object({
  username: z.string().min(3).max(64),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters.').max(128),
  full_name: z.string().trim().min(2, 'Full name is required.').max(100),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSubAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid sub-admin account data.' },
      { status: 400 }
    );
  }

  const usernameCheck = validateUsernameFormat(parsed.data.username);
  if (!usernameCheck.valid) {
    return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  if (RESERVED_USERNAMES.has(normalizedUsername)) {
    return NextResponse.json(
      { error: `Username "${normalizedUsername}" is reserved.` },
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
      role: 'sub_admin',
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
      role: 'sub_admin',
      is_active: true,
      must_change_password: true,
      created_by: auth.profile.id,
    })
    .select(SUB_ADMIN_SELECT)
    .single();

  if (profileErr || !profile) {
    // Roll back the auth user if the profile insert failed
    await adminClient.auth.admin.deleteUser(authCreated.user.id);
    return NextResponse.json(
      { error: profileErr?.message || 'Failed to create sub-admin profile.' },
      { status: 400 }
    );
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'SUB_ADMIN_CREATED',
    entityType: 'profile',
    entityId: profile.id,
    summary: `Created sub-admin account "${normalizedUsername}" (${parsed.data.full_name}).`,
    metadata: { username: normalizedUsername },
  });

  return NextResponse.json({ ok: true, subAdmin: profile }, { status: 201 });
}
