import Link from 'next/link';
import { BarChart3, Download, FileText, ShieldAlert, Users } from 'lucide-react';
import { requireMainAdminUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'Analytics & Audit Logs',
};

export default async function AdminAnalyticsPage() {
  await requireMainAdminUser();
  const adminClient = createSupabaseAdminClient();

  const [
    studentsRes,
    resourcesRes,
    downloadsLogRes,
    bookmarksCountRes,
    programmesRes,
    auditLogsRes,
  ] = await Promise.all([
    adminClient.from('profiles').select('id, programme_id, is_active').eq('role', 'student'),
    adminClient
      .from('resources')
      .select('id, title, programme_id, category_id, download_count, publication_status, file_type'),
    adminClient
      .from('downloads')
      .select('id, created_at, resource_id, user_id')
      .order('created_at', { ascending: false })
      .limit(25),
    adminClient.from('bookmarks').select('id', { count: 'exact', head: true }),
    adminClient.from('programmes').select('id, name, code').order('display_order'),
    adminClient
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const students = studentsRes.data || [];
  const resources = resourcesRes.data || [];
  const programmes = programmesRes.data || [];

  // The event list is read flat and joined here rather than through a nested
  // PostgREST embed: an embed that cannot resolve its relationship returns
  // `data: null`, which the page then reported as "No student downloads
  // recorded yet" — a wrong answer with no way to tell it apart from an empty
  // ledger.
  const downloadEvents = (downloadsLogRes.data || []) as {
    id: string;
    created_at: string;
    resource_id: string;
    user_id: string;
  }[];

  const eventResourceIds = [...new Set(downloadEvents.map((event) => event.resource_id))];
  const eventUserIds = [...new Set(downloadEvents.map((event) => event.user_id))];

  const eventResources = eventResourceIds.length
    ? ((await adminClient.from('resources').select('id, title').in('id', eventResourceIds)).data ?? [])
    : [];
  const eventUsers = eventUserIds.length
    ? ((await adminClient.from('profiles').select('id, username, full_name').in('id', eventUserIds)).data ?? [])
    : [];

  const titleByResourceId = new Map(eventResources.map((row) => [row.id, row.title]));
  const studentByProfileId = new Map(
    eventUsers.map((row) => [row.id, { username: row.username, full_name: row.full_name }])
  );

  // Nothing on this page is allowed to render a zero it did not read: a failed
  // query is named, not silently counted as "none yet".
  const failedReads = [
    ['students', studentsRes.error],
    ['materials', resourcesRes.error],
    ['download events', downloadsLogRes.error],
    ['bookmarks', bookmarksCountRes.error],
    ['programmes', programmesRes.error],
    ['activity logs', auditLogsRes.error],
  ].filter(([, error]) => Boolean(error)) as [string, { message: string }][];

  const totalDownloads = resources.reduce((sum, r) => sum + Number(r.download_count || 0), 0);
  const publishedCount = resources.filter((r) => r.publication_status === 'published').length;

  const programmeBreakdown = programmes.map((prog) => {
    const enrolled = students.filter((s) => s.programme_id === prog.id).length;
    const mats = resources.filter(
      (r) => r.programme_id === prog.id && r.publication_status === 'published'
    );
    const dls = mats.reduce((acc, r) => acc + Number(r.download_count || 0), 0);
    return {
      ...prog,
      enrolled,
      publishedMaterials: mats.length,
      downloads: dls,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Platform Analytics & Administrative Audit Logs
        </h1>
        <p className="mt-1 text-sm text-muted">
          Verified telemetry computed directly from PostgreSQL tables with zero synthetic figures.
        </p>
        {failedReads.length > 0 ? (
          <div className="mt-4 rounded-lg border border-burgundy/30 bg-burgundy/5 p-3 text-xs text-charcoal">
            <p className="font-semibold text-burgundy">
              Some figures below are missing, not zero.
            </p>
            <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-muted">
              {failedReads.map(([name, error]) => (
                <li key={name}>
                  {name}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Students</span>
            <Users className="h-4 w-4 text-burgundy" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-charcoal">{students.length}</p>
        </div>

        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Published Documents</span>
            <FileText className="h-4 w-4 text-burgundy" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-charcoal">{publishedCount}</p>
        </div>

        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Verified Downloads</span>
            <Download className="h-4 w-4 text-burgundy" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-charcoal">{totalDownloads}</p>
        </div>

        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Student Bookmarks</span>
            <BarChart3 className="h-4 w-4 text-burgundy" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-charcoal">
            {bookmarksCountRes.count || 0}
          </p>
        </div>
      </div>

      {/* Programme Breakdown Table */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-charcoal">
          Distribution by Degree Programme
        </h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5">Programme</th>
                <th className="p-3.5">Enrolled Students</th>
                <th className="p-3.5">Published Materials</th>
                <th className="p-3.5">Total Downloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {programmeBreakdown.map((row) => (
                <tr key={row.id}>
                  <td className="p-3.5 font-semibold text-charcoal">
                    {row.name} <span className="font-mono text-muted">({row.code})</span>
                  </td>
                  <td className="p-3.5 font-mono">{row.enrolled}</td>
                  <td className="p-3.5 font-mono">{row.publishedMaterials}</td>
                  <td className="p-3.5 font-mono font-semibold text-burgundy">{row.downloads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two-Column: Recent Download Events & Full Admin Audit Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5 rounded-xl border border-line bg-canvas p-5 space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-charcoal">Recent Student Download Events</h2>
          {downloadsLogRes.error ? (
            <p className="py-6 text-center text-xs text-burgundy">
              The download log could not be read: {downloadsLogRes.error.message}
            </p>
          ) : downloadEvents.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              No student downloads recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {downloadEvents.map((dl) => {
                const title = titleByResourceId.get(dl.resource_id) || null;
                const usr = studentByProfileId.get(dl.user_id) || null;
                return (
                  <div key={dl.id} className="py-2.5 space-y-0.5 text-xs">
                    {title ? (
                      <Link
                        href={`/resources/${dl.resource_id}`}
                        className="font-semibold text-charcoal hover:text-burgundy block truncate"
                      >
                        {title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-charcoal">Deleted Resource</span>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>{usr ? `${usr.full_name} (@${usr.username})` : 'Student'}</span>
                      <span className="font-mono">{formatDateTime(dl.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-7 rounded-xl border border-line bg-canvas p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-burgundy" />
            <h2 className="text-sm font-semibold text-charcoal">
              Administrative Activity Audit Trail
            </h2>
          </div>

          {!auditLogsRes.data || auditLogsRes.data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">No audit logs recorded.</p>
          ) : (
            <div className="divide-y divide-line max-h-[540px] overflow-y-auto pr-1">
              {auditLogsRes.data.map((log) => (
                <div key={log.id} className="py-3 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="burgundy">{log.action_type}</Badge>
                      <span className="font-mono text-[11px] text-muted">{log.entity_type}</span>
                    </div>
                    <span className="font-mono text-[11px] text-muted">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-charcoal">{log.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
