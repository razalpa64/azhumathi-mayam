import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isPushConfigured } from '@/lib/push';
import { friendlyDbError, isMissingSchemaError } from '@/lib/db-errors';

/** Whether push is configured on the server, and the public VAPID key. */
export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    enabled: isPushConfigured(),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  });
}

const pushActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('subscribe'),
    subscription: z.object({
      endpoint: z.string().url().max(2000),
      keys: z.object({
        p256dh: z.string().min(10).max(500),
        auth: z.string().min(5).max(500),
      }),
    }),
    userAgent: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('unsubscribe'),
    endpoint: z.string().url().max(2000),
  }),
]);

/**
 * Subscribe/unsubscribe this device. Writes go through the admin
 * client with user_id forced to the signed-in profile: an endpoint is
 * globally unique, so on a shared device the row must be reassignable
 * to whoever just opted in (the RLS own-row policies would block
 * updating another user's row through the user client).
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'Push notifications are not switched on yet.' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = pushActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid push action.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();

  if (parsed.data.action === 'subscribe') {
    const { subscription, userAgent } = parsed.data;
    const { error } = await adminClient.from('push_subscriptions').upsert(
      {
        user_id: auth.profile.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
      },
      { onConflict: 'endpoint' }
    );
    if (error) {
      return NextResponse.json(
        { error: friendlyDbError(error, 'Could not save your subscription.') },
        { status: isMissingSchemaError(error) ? 503 : 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await adminClient
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', parsed.data.endpoint)
    .eq('user_id', auth.profile.id);
  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not remove your subscription.') },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
