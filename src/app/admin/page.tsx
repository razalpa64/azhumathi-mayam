import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Download,
  FilePlus2,
  FolderKanban,
  GraduationCap,
  HardDrive,
  Megaphone,
  UserPlus,
  Users,
} from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'Administrator Overview',
};

export default async function AdminOverviewPage() {
  await requireAdminUser();
  const adminClient = createSupabaseAdminClient();

  const [
    totalStudentsRes,
    activeStudentsRes,
    totalProgrammesRes,
    totalSubjectsRes,
    publishedResourcesRes,
    draftResourcesRes,
    allDownloadCountsRes,
    recentUploadsRes,
    topDownloadedRes,
    recentStudentsRes,
    recentAuditRes,
  ] = await Promise.all([
    adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('is_active', true),
    adminClient.from('programmes').select('id', { count: 'exact', head: true }),
    adminClient.from('subjects').select('id', { count: 'exact', head: true }),
    adminClient
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('publication_status', 'published'),
    adminClient
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('publication_status', 'draft'),
    adminClient.from('resources').select('download_count'),
    adminClient
      .from('resources')
      .select(
        'id, title, file_type, publication_status, created_at, programme:programmes(name), semester:semesters(label), subject:subjects(subject_code)'
      )
      .order('created_at', { ascending: false })
      .limit(6),
    adminClient
      .from('resources')
      .select('id, title, download_count, file_type, subject:subjects(subject_code)')
      .eq('publication_status', 'published')
      .order('download_count', { ascending: false })
      .limit(6),
    adminClient
      .from('profiles')
      .select('id, username, full_name, last_login_at, created_at, programme:programmes(name)')
      .eq('role', 'student')
      .order('last_login_at', { ascending: false, nullsFirst: false })
      .limit(6),
    adminClient
      .from('admin_activity_logs')
      .select('id, action_type, summary, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const totalDownloads = (allDownloadCountsRes.data || []).reduce(
    (sum, r) => sum + Number(r.download_count || 0),
    0
  );

  const statCards = [
    {
      label: 'Registered Students',
      value: totalStudentsRes.count || 0,
      sub: `${activeStudentsRes.count || 0} active accounts`,
      icon: Users,
      href: '/admin/students',
    },
    {
      label: 'Active Students',
      value: activeStudentsRes.count || 0,
      sub: 'Permitted portal access',
      icon: Activity,
      href: '/admin/students?status=active',
    },
    {
      label: 'Degree Programmes',
      value: totalProgrammesRes.count || 0,
      sub: `${totalSubjectsRes.count || 0} configured subjects`,
      icon: GraduationCap,
      href: '/admin/courses',
    },
    {
      label: 'Subjects',
      value: totalSubjectsRes.count || 0,
      sub: 'Dynamic curriculum entries',
      icon: BookOpen,
      href: '/admin/subjects',
    },
    {
      label: 'Published Resources',
      value: publishedResourcesRes.count || 0,
      sub: `${draftResourcesRes.count || 0} saved as draft`,
      icon: FolderKanban,
      href: '/admin/resources',
    },
    {
      label: 'Total Downloads',
      value: totalDownloads,
      sub: 'Deduplicated student downloads',
      icon: Download,
      href: '/admin/analytics',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-burgundy">
            Super Administrator Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">
            Platform Operations Overview
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live database metrics across student accounts, academic taxonomy, and Google Drive resources.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/upload"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-3.5 text-xs font-semibold text-canvas hover:bg-burgundy-dark transition-colors"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Upload Resource</span>
          </Link>
          <Link
            href="/admin/students"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
          >
            <UserPlus className="h-3.5 w-3.5 text-burgundy" />
            <span>Add Student</span>
          </Link>
          <Link
            href="/admin/notices"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
          >
            <Megaphone className="h-3.5 w-3.5 text-burgundy" />
            <span>Post Notice</span>
          </Link>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-line bg-canvas p-5 hover:border-burgundy-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">{stat.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-neutral-soft text-burgundy">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold text-charcoal">{stat.value}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{stat.sub}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-burgundy" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Storage Architecture Status Banner */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-line bg-neutral-soft/75 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-canvas text-burgundy">
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-charcoal">
                Document Storage Provider: GoogleDriveLinkProvider
              </h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted leading-relaxed">
              Documents are hosted on your Google Drive account via validated sharing links (&ldquo;Anyone
              with the link – Viewer&rdquo;). Zero Google Cloud OAuth credentials required; metadata and
              academic categorization are stored in Supabase PostgreSQL.
            </p>
          </div>
        </div>
        <Link
          href="/admin/upload"
          className="shrink-0 text-xs font-semibold text-burgundy hover:underline"
        >
          Link New Document →
        </Link>
      </section>

      {/* Two-Column Tables: Recent Uploads & Top Downloads */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-canvas p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Recently Uploaded Materials</h2>
            <Link href="/admin/resources" className="text-xs font-semibold text-burgundy hover:underline">
              Manage All
            </Link>
          </div>

          {!recentUploadsRes.data || recentUploadsRes.data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              No study materials added yet. Use Upload Resources to link your first Google Drive PDF.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {recentUploadsRes.data.map((item) => {
                const subj = item.subject as unknown as { subject_code: string } | null;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/resources/${item.id}`}
                        className="block truncate text-xs font-semibold text-charcoal hover:text-burgundy"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {subj?.subject_code ? `${subj.subject_code} • ` : ''}
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={item.publication_status === 'published' ? 'success' : 'warning'}
                    >
                      {item.publication_status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-canvas p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Most Downloaded Resources</h2>
            <Link href="/admin/analytics" className="text-xs font-semibold text-burgundy hover:underline">
              Analytics
            </Link>
          </div>

          {!topDownloadedRes.data || topDownloadedRes.data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              Download rankings will populate automatically as students download published materials.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {topDownloadedRes.data.map((item) => {
                const subj = item.subject as unknown as { subject_code: string } | null;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/resources/${item.id}`}
                        className="block truncate text-xs font-semibold text-charcoal hover:text-burgundy"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {subj?.subject_code || item.file_type}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-burgundy">
                      {item.download_count} dl
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Recent Student Activity & Audit Trail */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-canvas p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Recent Student Activity</h2>
            <Link href="/admin/students" className="text-xs font-semibold text-burgundy hover:underline">
              All Students
            </Link>
          </div>

          {!recentStudentsRes.data || recentStudentsRes.data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              No student accounts created yet. Create student accounts in Students Management.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {recentStudentsRes.data.map((st) => {
                const prog = st.programme as unknown as { name: string } | null;
                return (
                  <div key={st.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-xs font-semibold text-charcoal">{st.full_name}</p>
                      <p className="font-mono text-[11px] text-muted">
                        @{st.username} {prog?.name ? `• ${prog.name}` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-muted">
                      {st.last_login_at
                        ? `Active ${formatDateTime(st.last_login_at)}`
                        : `Created ${formatDate(st.created_at)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-canvas p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Recent Administrative Audit Log</h2>
            <Link href="/admin/analytics" className="text-xs font-semibold text-burgundy hover:underline">
              Full Audit Log
            </Link>
          </div>

          {!recentAuditRes.data || recentAuditRes.data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">No administrative events logged.</p>
          ) : (
            <div className="divide-y divide-line">
              {recentAuditRes.data.map((log) => (
                <div key={log.id} className="py-2.5 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-burgundy">
                      {log.action_type}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal">{log.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
