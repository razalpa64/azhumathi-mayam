/**
 * Never show a raw database error to a person.
 *
 * Two cases matter:
 *  - A table/column the code expects isn't in the database yet (a
 *    migration hasn't been applied). Students get a calm "still being
 *    set up" line; the admin gets told exactly what to do.
 *  - Anything else. Students get the caller's plain fallback; the admin
 *    (who can act on it) still sees the real message.
 */

type DbErrorLike = { code?: string; message?: string } | null | undefined;

export function isMissingSchemaError(error: unknown): boolean {
  const e = error as DbErrorLike;
  if (!e) return false;
  const msg = (e.message || '').toLowerCase();
  return (
    e.code === 'PGRST205' || // table not in PostgREST schema cache
    e.code === 'PGRST204' || // column not in schema cache
    e.code === '42P01' || // undefined_table
    e.code === '42703' || // undefined_column
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

export function friendlyDbError(
  error: unknown,
  fallback: string,
  audience: 'student' | 'admin' = 'student'
): string {
  if (isMissingSchemaError(error)) {
    return audience === 'admin'
      ? 'Looks like a database update is pending. Apply the latest migrations (npm run db:provision, or paste them into the Supabase SQL editor), then try again.'
      : 'This feature is still being set up on our side. Please try again in a little while.';
  }
  if (audience === 'admin') {
    return (error as DbErrorLike)?.message || fallback;
  }
  return fallback;
}
