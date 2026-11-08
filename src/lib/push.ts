import * as webpush from 'web-push';
import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path to open when the notification is tapped. */
  url: string;
}

let configured = false;

/**
 * Web Push needs a VAPID key pair in the environment:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 *   VAPID_SUBJECT (defaults to the help mailbox).
 * When they are absent the whole feature quietly disables itself —
 * the subscribe API reports { enabled: false } and sends no-op.
 */
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:help.azhimathimayam@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  configured = true;
  return true;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Best-effort push to every subscribed device of the given users.
 * Never throws: a push failure must not fail the action that
 * triggered it. Subscriptions the push service reports as gone
 * (404/410) are pruned so dead endpoints do not accumulate.
 */
export async function sendPushToUsers(
  adminClient: AdminClient,
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
  if (!ensureConfigured() || userIds.length === 0) return { sent: 0, pruned: 0 };

  const uniqueIds = Array.from(new Set(userIds));
  const rows: SubscriptionRow[] = [];
  for (let i = 0; i < uniqueIds.length; i += 400) {
    const { data } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', uniqueIds.slice(i, i + 400));
    if (data) rows.push(...(data as SubscriptionRow[]));
  }
  if (rows.length === 0) return { sent: 0, pruned: 0 };

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    icon: '/icons/icon-192.png',
  });

  let sent = 0;
  const deadIds: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const results = await Promise.allSettled(
      batch.map((row) =>
        webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          message,
          { TTL: 60 * 60 * 24 }
        )
      )
    );
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        sent += 1;
      } else {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) deadIds.push(batch[idx].id);
      }
    });
  }

  if (deadIds.length > 0) {
    await adminClient.from('push_subscriptions').delete().in('id', deadIds);
  }
  return { sent, pruned: deadIds.length };
}
