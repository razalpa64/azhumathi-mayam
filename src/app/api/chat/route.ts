import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CHAT_FETCH_LIMIT, CHAT_MESSAGE_MAX, CHAT_SELECT, getIstDayStartIso } from '@/lib/chat';

/**
 * The daily reset, enforced softly: every chat read/write also deletes
 * yesterday's rows (admin client, indexed, non-fatal). The cron route
 * (/api/cron/chat-cleanup) does the same on a schedule, so old messages
 * never pile up even if nobody opens the chat.
 */
async function cleanupExpired() {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('chat_messages').delete().lt('created_at', getIstDayStartIso());
  } catch {
    // Cleanup must never break chatting (e.g. migration not applied yet)
  }
}

const sendSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write something first.')
    .max(CHAT_MESSAGE_MAX, `Keep it under ${CHAT_MESSAGE_MAX} characters.`),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const since = request.nextUrl.searchParams.get('since');
  const supabase = await createSupabaseServerClient();

  void cleanupExpired();

  let query = supabase
    .from('chat_messages')
    .select(CHAT_SELECT)
    .gte('created_at', getIstDayStartIso())
    .order('created_at', { ascending: false })
    .limit(CHAT_FETCH_LIMIT);

  if (since) query = query.gt('created_at', since);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Latest-window fetch comes back newest-first; clients render oldest-first
  return NextResponse.json({ messages: (data || []).reverse() });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.profile.role === 'admin') {
    return NextResponse.json({ error: 'The group chat is for students.' }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid message.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Gentle flood guard: one message every couple of seconds is plenty
  const { data: last } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 2000) {
    return NextResponse.json(
      { error: 'One second — messages are flying. Try again in a moment.' },
      { status: 429 }
    );
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: auth.profile.id, body: parsed.data.body })
    .select(CHAT_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  void cleanupExpired();
  return NextResponse.json({ message: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing message id.' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
