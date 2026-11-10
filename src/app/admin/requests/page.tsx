import { requireStaffUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { RequestsManagerClient } from '@/components/admin/RequestsManagerClient';

export const metadata = {
  title: 'Student Requests',
};

export default async function AdminRequestsPage() {
  await requireStaffUser();
  const adminClient = createSupabaseAdminClient();
  // The list itself is paged by the client through /api/admin/requests; this
  // page only needs the waiting count and to know the table exists.
  const { count, error } = await adminClient
    .from('resource_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const pending = count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">Student requests</h1>
        <p className="mt-1 text-sm text-muted">
          What students are asking for.
          {pending > 0 ? (
            <>
              {' '}
              <span className="font-semibold text-burgundy">
                {pending} waiting for a reply.
              </span>
            </>
          ) : (
            ' Nothing waiting right now.'
          )}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-burgundy-border bg-burgundy-tint px-5 py-4 text-sm text-charcoal">
          <span className="font-semibold text-burgundy">Requests are not switched on yet.</span>{' '}
          The <span className="font-mono text-[13px]">resource_requests</span> table was not
          found — apply the pending migrations (run{' '}
          <span className="font-mono text-[13px]">npm run db:provision</span>, or paste{' '}
          <span className="font-mono text-[13px]">supabase/migrations/0002_requests_and_short_notes.sql</span>{' '}
          into the Supabase SQL editor), then reload this page.
        </div>
      ) : null}

      <RequestsManagerClient initialPending={pending} />
    </div>
  );
}
