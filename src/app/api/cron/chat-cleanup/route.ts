
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getIstDayStartIso } from '@/lib/chat';

/**
 * Nightly purge for the group chat (the hard guarantee behind the daily
 * reset). Call with an `Authorization: Bearer <secret>` header from any
 * scheduler — e.g. a Vercel Cron at 18:30 UTC (= midnight IST) or an
 * external pinger. The expected secret is the CRON_SECRET env variable.
 * Day to day, chat reads/writes also clean up opportunistically, so this
 * endpoint is a backstop, not a single point of failure.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Cron secret is not configured.' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error, count } = await admin
      .from('chat_messages')
      .delete({ count: 'exact' })
      .lt('created_at', getIstDayStartIso());

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deleted: count || 0 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cleanup failed.' },
      { status: 500 }
    );
  }
}
