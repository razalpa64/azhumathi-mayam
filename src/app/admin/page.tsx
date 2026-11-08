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
  Inbox,
  Megaphone,
  UserPlus,
  Users,
} from 'lucide-react';
import { requireStaffUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/Badge';
import { UploadsChart } from '@/components/admin/UploadsChart';
import { RadialProgress } from '@/components/admin/RadialProgress';
import { MiniCalendar } from '@/components/admin/MiniCalendar';
import { formatDate, formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'Administrator Overview',
};

export default async function AdminOverviewPage() {
  const profile = await requireStaffUser();
  const isMainAdmin = profile.role === 'admin';
  const adminClient = createSupabaseAdminClient();

  const nowDate = new Date();
  const sixMonthsAgoIso = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() - 5,
    1
  ).toISOString();
  const thirtyDaysAgoIso = new Date(
    nowDate.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

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
    pendingRequestsRes,
    uploadsTimelineRes,
    active30Res,
  ] = await Promise.all([
    isMainAdmin
      ? adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')
      : Promise.resolve({ count: 0 }),
    isMainAdmin
      ? adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('is_active', true)
      : Promise.resolve({ count: 0 }),
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
    isMainAdmin
      ? adminClient
          .from('profiles')
          .select('id, username, full_name, last_login_at, created_at, programme:programmes(name)')
          .eq('role', 'student')
          .order('last_login_at', { ascending: false, nullsFirst: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    isMainAdmin
      ? adminClient
          .from('admin_activity_logs')
          .select('id, action_type, summary, created_at')
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    adminClient
      .from('resource_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Upload timeline for the Statistics chart + calendar dots.
    adminClient
      .from('resources')
      .select('created_at')
      .gte('created_at', sixMonthsAgoIso)
      .order('created_at', { ascending: true })
      .limit(2000),
    isMainAdmin
      ? adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .gte('last_login_at', thirtyDaysAgoIso)
      : Promise.resolve({ count: 0 }),
  ]);

  const totalDownloads = (allDownloadCountsRes.data || []).reduce(
    (sum, r) => sum + Number(r.download_count || 0),
    0
  );

  // ---- Statistics chart + calendar data (last six months) ----
  const chartMonths: { label: string; uploads: number }[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthIndex.set(key, chartMonths.length);
    chartMonths.push({
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      uploads: 0,
    });
  }
  const uploadDaysByMonth: Record<string, number[]> = {};
  for (const row of uploadsTimelineRes.data || []) {
    const iso = row.created_at as string;
    const key = iso.slice(0, 7);
    const idx = monthIndex.get(key);
    if (idx !== undefined) chartMonths[idx].uploads += 1;
    const day = Number(iso.slice(8, 10));
    if (!uploadDaysByMonth[key]) uploadDaysByMonth[key] = [];
    if (!uploadDaysByMonth[key].includes(day)) uploadDaysByMonth[key].push(day);
  }
  const sixMonthUploads = chartMonths.reduce((s, m) => s + m.uploads, 0);
  const thisMonthUploads = chartMonths[chartMonths.length - 1]?.uploads || 0;

  const publishedCount = publishedResourcesRes.count || 0;
  const draftCount = draftResourcesRes.count || 0;
  const libraryTotal = publishedCount + draftCount;
  const publishedPct = libraryTotal > 0 ? (publishedCount / libraryTotal) * 100 : 0;

  const totalStudents = totalStudentsRes.count || 0;
  const activeStudents = activeStudentsRes.count || 0;
  const active30 = active30Res.count || 0;

  const ringCards = isMainAdmin
    ? [
        {
          title: 'Active students',
          percent: totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0,
          value: String(activeStudents),
          sub: `of ${totalStudents} registered`,
        },
        {
          title: 'Seen in 30 days',
          percent: totalStudents > 0 ? (active30 / totalStudents) * 100 : 0,
          value: String(active30),
          sub: 'students signed in recently',
        },
      ]
    : [
        {
          title: 'Uploads this month',
          percent: sixMonthUploads > 0 ? (thisMonthUploads / sixMonthUploads) * 100 : 0,
          value: String(thisMonthUploads),
          sub: 'of the last 6 months',
        },
        {
          title: 'Waiting to publish',
          percent: libraryTotal > 0 ? (draftCount / libraryTotal) * 100 : 0,
          value: String(draftCount),
          sub: 'drafts in the library',
        },
      ];

  const statCards = isMainAdmin
    ? [
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
      ]
    : [
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
          sub: 'Live for students right now',
          icon: FolderKanban,
          href: '/admin/resources',
        },
        {
          label: 'Draft Resources',
          value: draftResourcesRes.count || 0,
          sub: 'Waiting to be published',
          icon: FilePlus2,
          href: '/admin/resources',
        },
        {
          label: 'Requests Waiting',
          value: pendingRequestsRes.count || 0,
          sub: 'Students asked for materials',
          icon: Inbox,
          href: '/admin/requests',
        },
        {
          label: 'Total Downloads',
          value: totalDownloads,
          sub: 'Across all published materials',
          icon: Download,
          href: '/admin/resources',
        },
      ];

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-burgundy">
            {isMainAdmin ? 'Super Administrator' : 'Content Manager'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">
            Overview
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isMainAdmin
              ? 'Students, materials and downloads — the latest numbers.'
              : 'Materials, courses and student requests — the latest numbers.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/upload"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-3.5 text-xs font-semibold text-canvas hover:bg-burgundy-dark transition-colors"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Add a resource</span>
          </Link>
          {isMainAdmin ? (
            <>
              <Link
                href="/admin/students"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
              >
                <UserPlus className="h-3.5 w-3.5 text-burgundy" />
                <span>Add student</span>
              </Link>
              <Link
                href="/admin/notices"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
              >
                <Megaphone className="h-3.5 w-3.5 text-burgundy" />
                <span>Post a notice</span>
              </Link>
            </>
          ) : (
            <Link
              href="/admin/requests"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
            >
              <Inbox className="h-3.5 w-3.5 text-burgundy" />
              <span>Answer requests</span>
            </Link>
          )}
        </div>
      </div>

      {/* Statistics + Library — the reference layout, in burgundy */}
      <div className="anim-stagger grid gap-6 xl:grid-cols-3">
        <section className="rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-charcoal">Statistics</h2>
              <p className="mt-0.5 text-xs text-muted">
                Study materials added, month by month
              </p>
            </div>
            <span className="rounded-full bg-burgundy-tint px-3 py-1.5 text-[11px] font-semibold text-burgundy">
              {sixMonthUploads} new in 6 months
            </span>
          </div>
          <div className="mt-5">
            <UploadsChart data={chartMonths} />
          </div>
        </section>

        <section className="flex flex-col rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05]">
          <h2 className="text-[15px] font-semibold text-charcoal">Library at a glance</h2>
          <div className="flex justify-center py-5">
            <RadialProgress percent={publishedPct} size={148}>
              <span className="text-[26px] font-extrabold leading-none text-charcoal">
                {Math.round(publishedPct)}%
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                published
              </span>
            </RadialProgress>
          </div>
          <dl className="mt-auto divide-y divide-line text-[13px]">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">Published :</dt>
              <dd className="font-mono font-semibold text-charcoal">{publishedCount}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">In draft :</dt>
              <dd className="font-mono font-semibold text-charcoal">{draftCount}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">Downloads :</dt>
              <dd className="font-mono font-semibold text-charcoal">{totalDownloads}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Rings + Calendar */}
      <div className="anim-stagger grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {ringCards.map((card) => (
          <section
            key={card.title}
            className="flex flex-col items-center rounded-[24px] bg-white p-6 text-center shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05]"
          >
            <h3 className="self-start text-[15px] font-semibold text-charcoal">{card.title}</h3>
            <div className="py-4">
              <RadialProgress percent={card.percent} size={126} stroke={11}>
                <span className="text-[22px] font-extrabold leading-none text-charcoal">
                  {card.value}
                </span>
              </RadialProgress>
            </div>
            <p className="text-sm font-bold text-burgundy">{Math.round(card.percent)}%</p>
            <p className="mt-0.5 text-xs text-muted">{card.sub}</p>
          </section>
        ))}

        <section className="rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] md:col-span-2">
          <h3 className="mb-4 text-[15px] font-semibold text-charcoal">Calendar</h3>
          <MiniCalendar uploadDaysByMonth={uploadDaysByMonth} />
        </section>
      </div>

      {/* Live Metrics Grid */}
      <section className="anim-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-[20px] bg-white p-5 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_45px_-26px_rgba(36,7,7,0.45)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">{stat.label}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy-tint text-burgundy">
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
      <section className="anim-rise flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[24px] bg-white px-6 py-5 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05]" style={{ animationDelay: '200ms' }}>
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
        <section className="anim-rise rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] space-y-4" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Recently added</h2>
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

        <section className="anim-rise rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] space-y-4" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Most downloaded</h2>
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

      {/* New students & Audit Trail — super admin only */}
      {isMainAdmin ? (
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="anim-rise rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] space-y-4" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">New students</h2>
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

        <section className="anim-rise rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.05] space-y-4" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal">Recent changes</h2>
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
      ) : null}
    </div>
  );
}
