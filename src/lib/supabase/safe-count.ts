/**
 * Resolve a Supabase count query without ever throwing.
 *
 * Every one of these is a badge number — unread notices, pending requests.
 * A transient failure between the server and Supabase would reject the
 * promise and take the whole layout down with it, trading a missing number
 * for a blank page. The number can be wrong for one request; the page cannot
 * be missing.
 */
export async function safeCount<T extends { count: number | null; error: unknown }>(
  builder: PromiseLike<T>
): Promise<number> {
  try {
    const { count, error } = await builder;
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}
