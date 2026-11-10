import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiStaff, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting',
  in_progress: 'Being worked on',
  fulfilled: 'Done — it’s live',
  rejected: 'Closed',
};

const STATUS_VALUES = ['pending', 'in_progress', 'fulfilled', 'rejected'] as const;

const REQUEST_SELECT = '*, student:profiles!student_id(id, full_name, username)';

/**
 * The request list is paged and searched on the server. It used to be a single
 * hard `limit(200)` with no paging, so a busy month silently hid every older
 * request behind the newest two hundred.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  // PostgREST filters are comma/paren delimited — strip anything structural.
  const q = (sp.get('q') || '').replace(/[,%()'"\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const status = sp.get('status') || '';
  const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(sp.get('pageSize') || '20', 10) || 20));

  const adminClient = createSupabaseAdminClient();

  let query = adminClient
    .from('resource_requests')
    .select(REQUEST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false });

  if ((STATUS_VALUES as readonly string[]).includes(status)) query = query.eq('status', status);

  if (q.length >= 2) {
    const like = `%${q}%`;
    // One search box covers the request text and the student who asked, so a
    // name match has to be resolved to ids first.
    const { data: students } = await adminClient
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.${like},username.ilike.${like}`)
      .limit(50);

    const parts = [`title.ilike.${like}`, `subject_text.ilike.${like}`, `details.ilike.${like}`];
    const ids = (students || []).map((student) => student.id);
    if (ids.length > 0) parts.push(`student_id.in.(${ids.join(',')})`);
    query = query.or(parts.join(','));
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'That request operation failed. Please try again.', 'admin') },
      { status: 400 }
    );
  }

  const { count: pendingCount } = await adminClient
    .from('resource_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const total = count || 0;

  return NextResponse.json({
    items: data || [],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    pendingCount: pendingCount || 0,
  });
}

const singleSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUS_VALUES),
  admin_note: z.string().trim().max(1000).nullable().optional(),
});

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(STATUS_VALUES),
  admin_note: z.string().trim().max(1000).nullable().optional(),
});

/**
 * Move one request (the inline editor) or many at once (the selection bar).
 * Either way the student is told, and the console keeps one audit line.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const adminClient = createSupabaseAdminClient();

  // ---- Bulk ----------------------------------------------------------
  if (body && typeof body === 'object' && 'ids' in (body as Record<string, unknown>)) {
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid bulk update.' },
        { status: 400 }
      );
    }
    const { ids, status, admin_note } = parsed.data;

    const { data: before } = await adminClient
      .from('resource_requests')
      .select('id, title, status, student_id')
      .in('id', ids);

    const rows = before || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Those requests were not found.' }, { status: 404 });
    }

    const patch: Record<string, unknown> = { status };
    if (admin_note !== undefined) patch.admin_note = admin_note;

    const { error } = await adminClient
      .from('resource_requests')
      .update(patch)
      .in(
        'id',
        rows.map((row) => row.id)
      );

    if (error) {
      return NextResponse.json(
        { error: friendlyDbError(error, 'That bulk update failed. Please try again.', 'admin') },
        { status: 400 }
      );
    }

    // Only tell students whose request actually moved.
    const moved = rows.filter((row) => row.status !== status);
    if (moved.length > 0) {
      try {
        await adminClient.from('notifications').insert(
          moved.map((row) => ({
            user_id: row.student_id,
            title: `Request update: ${row.title}`,
            message: `${STATUS_LABELS[status]}${admin_note ? ` — ${admin_note}` : ''}`,
            notification_type: 'system',
            link_url: '/dashboard/requests',
          }))
        );
      } catch {
        // Notifications are a bonus; the status change already landed.
      }
    }

    await logAdminActivity({
      adminId: auth.profile.id,
      actionType: 'REQUEST_STATUS_UPDATED',
      entityType: 'resource_request',
      entityId: rows[0].id,
      summary: `${rows.length} request${rows.length === 1 ? '' : 's'} → ${status}`,
      metadata: { ids: rows.map((row) => row.id), to: status },
    });

    return NextResponse.json({ ok: true, updated: rows.length, moved: moved.length, status });
  }

  // ---- Single --------------------------------------------------------
  const parsed = singleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid update.' },
      { status: 400 }
    );
  }

  const { data: before } = await adminClient
    .from('resource_requests')
    .select('*')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  const { data, error } = await adminClient
    .from('resource_requests')
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note ?? before.admin_note,
    })
    .eq('id', parsed.data.id)
    .select(REQUEST_SELECT)
    .single();
  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'That request operation failed. Please try again.', 'admin') },
      { status: 400 }
    );
  }

  // Tell the student their request moved
  if (before.status !== parsed.data.status) {
    await adminClient.from('notifications').insert({
      user_id: before.student_id,
      title: `Request update: ${before.title}`,
      message:
        `${STATUS_LABELS[parsed.data.status]}` +
        (parsed.data.admin_note ? ` — ${parsed.data.admin_note}` : ''),
      notification_type: 'system',
      link_url: '/dashboard/requests',
    });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'REQUEST_STATUS_UPDATED',
    entityType: 'resource_request',
    entityId: parsed.data.id,
    summary: `Request "${before.title}" → ${parsed.data.status}`,
    metadata: { from: before.status, to: parsed.data.status },
  });

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from('resource_requests').delete().eq('id', id);
  if (error)
    return NextResponse.json(
      { error: friendlyDbError(error, 'That request operation failed. Please try again.', 'admin') },
      { status: 400 }
    );
  return NextResponse.json({ ok: true });
}
