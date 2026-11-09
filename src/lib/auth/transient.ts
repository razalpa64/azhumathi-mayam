/**
 * Is this auth error a temporary condition rather than a real "signed out"?
 *
 * Supabase reports an unreachable auth server, a timeout, a rate limit or a
 * 5xx as an error on `getUser()` — with no user. Treated literally, that
 * means "you are not signed in", and the person gets bounced to /login in
 * the middle of a task, with their session perfectly intact. Everything in
 * here is worth a retry or a pass-through, never a sign-out.
 *
 * No imports on purpose: the middleware imports this on the edge runtime.
 */
export function isTransientAuthError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: string; status?: number };
  if (e.name === 'AuthRetryableFetchError') return true;
  const status = e.status ?? 0;
  return status === 0 || status === 408 || status === 429 || status >= 500;
}
