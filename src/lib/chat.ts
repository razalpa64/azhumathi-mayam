/**
 * Group chat rules, shared by the page, the API and the dashboard teaser.
 * The room resets daily at midnight IST: reads/writes only touch today's
 * rows, older rows are cleaned up opportunistically + by the cron route.
 */

export const CHAT_MESSAGE_MAX = 500;
/** How many of today's messages a single fetch returns (latest window). */
export const CHAT_FETCH_LIMIT = 200;

/** ISO timestamp for midnight today in Asia/Kolkata, in UTC. */
export function getIstDayStartIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [year, month, day] = parts.split('-').map(Number);
  // IST is UTC+5:30 year-round (no DST), so IST midnight = 18:30 UTC the day before.
  return new Date(Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000).toISOString();
}

/** "4:32 pm" in IST, for message timestamps. */
export function formatChatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

/** Select that pulls a chat message together with its sender's public bits. */
export const CHAT_SELECT =
  'id, user_id, body, created_at, sender:profiles!user_id(id, full_name, avatar_url, programme:programmes(name))';
