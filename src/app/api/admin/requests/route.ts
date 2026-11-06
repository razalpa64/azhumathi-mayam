import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAdmin, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting',
  in_progress: 'Being worked on',
  fulfilled: 'Done — it’s live',
  rejected: 'Closed',
};

export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const status = request.nextUrl.searchParams.get('status') || '';
  const adminClient = createSupabaseAdminClient();

  let query = adminClient
    .from('resource_requests')
    .select('*, student:profiles!student_id(id, full_name, username)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { count: pendingCount } = await adminClient
    .from('resource_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return NextResponse.json({ items: data || [], pendingCount: pendingCount || 0 });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'fulfilled', 'rejected']),
  admin_note: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid update.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
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
    .select('*, student:profiles!student_id(id, full_name, username)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from('resource_requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
