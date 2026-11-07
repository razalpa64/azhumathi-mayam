import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Manage ONE sub-admin account (activate/deactivate, reset password,
 * delete). Super-admin only, and the target must actually be a
 * sub-admin — this route can never touch student or super-admin
 * accounts, whatever id is passed in.
 */

const SUB_ADMIN_SELECT =
  'id, username, full_name, role, is_active, must_change_password, last_login_at, created_at, created_by';

async function loadSubAdmin(id: string) {
  const adminClient = createSupabaseAdminClient();
  const { data } = await adminClient
    .from('profiles')
    .select(SUB_ADMIN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (!data || data.role !== 'sub_admin') return null;
  return data;
}

const patchSchema = z.object({
  is_active: z.boolean().optional(),
  temporaryPassword: z
    .string()
    .min(8, 'Temporary password must be at least 8 characters.')
    .max(128)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const target = await loadSubAdmin(id);
  if (!target) {
    return NextResponse.json({ error: 'Sub-admin account not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid update.' },
      { status: 400 }
    );
  }
  if (parsed.data.is_active === undefined && !parsed.data.temporaryPassword) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();

  if (parsed.data.temporaryPassword) {
    const { error: pwErr } = await adminClient.auth.admin.updateUserById(id, {
      password: parsed.data.temporaryPassword,
    });
    if (pwErr) {
      return NextResponse.json(
        { error: pwErr.message || 'Could not reset the password.' },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
  if (parsed.data.temporaryPassword) updates.must_change_password = true;

  const { data: updated, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(SUB_ADMIN_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not update the sub-admin account.', 'admin') },
      { status: 400 }
    );
  }

  if (parsed.data.temporaryPassword) {
    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: 'SUB_ADMIN_PASSWORD_RESET',
      entityType: 'profile',
      entityId: id,
      summary: `Reset the password of sub-admin "${target.username}".`,
    });
  }
  if (parsed.data.is_active !== undefined) {
    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: parsed.data.is_active ? 'SUB_ADMIN_ACTIVATED' : 'SUB_ADMIN_DEACTIVATED',
      entityType: 'profile',
      entityId: id,
      summary: `${parsed.data.is_active ? 'Activated' : 'Deactivated'} sub-admin "${target.username}".`,
    });
  }

  return NextResponse.json({ ok: true, subAdmin: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (id === auth.profile.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const target = await loadSubAdmin(id);
  if (!target) {
    return NextResponse.json({ error: 'Sub-admin account not found.' }, { status: 404 });
  }

  const adminClient = createSupabaseAdminClient();
  // Deleting the auth user cascades to the profile row (FK ON DELETE CASCADE).
  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json(
      { error: error.message || 'Could not delete the sub-admin account.' },
      { status: 400 }
    );
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'SUB_ADMIN_DELETED',
    entityType: 'profile',
    entityId: id,
    summary: `Deleted sub-admin account "${target.username}" (${target.full_name}).`,
  });

  return NextResponse.json({ ok: true });
}
