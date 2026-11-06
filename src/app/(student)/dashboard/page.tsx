import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Clock,
  FileQuestion,
  GraduationCap,
  Layers,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { requireStudentAppUser, getWebsiteSettings } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveAdvertisementsByPlacement } from '@/lib/ads';
import { GlobalSearchBar } from '@/components/student/GlobalSearchBar';
import { NoticeBoard } from '@/components/student/NoticeBoard';
import { ResourceCard } from '@/components/student/ResourceCard';
import { AdSlot } from '@/components/ads/AdSlot';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Notice, Resource, Subject } from '@/types/database';
import { getGreetingByHour } from '@/lib/utils';

const RESOURCE_JOIN = `
  *,
  programme:programmes(id, code, name),
  specialization:specializations(id, code, name),
  semester:semesters(id, semester_number, label),
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name, slug, is_question_paper),
  university:universities(id, short_name, name),
  regulation:academic_regulations(id, code, name)
`;

export const metadata = {
  title: 'Student Dashboard',
};

export default async function StudentDashboardPage() {
  const profile = await requireStudentAppUser();
  const [settings, adConfig, supabase] = await Promise.all([
    getWebsiteSettings(),
    getActiveAdvertisementsByPlacement(),
    createSupabaseServerClient(),
  ]);

  const nowIso = new Date().toISOString();

  // 1. Active notices (global or targeted to student's programme)
  let notices: Notice[] = [];
  if (settings.notices_enabled) {
    let nQuery = supabase
      .from('notices')
      .select('*, target_programme:programmes(id, code, name)')
      .eq('publication_status', 'published')
      .lte('start_date', nowIso)
      .order('is_pinned', { ascending: false })
      .order('start_date', { ascending: false })
      .limit(6);

    if (profile.programme_id) {
      nQuery = nQuery.or(`target_programme_id.is.null,target_programme_id.eq.${profile.programme_id}`);
    } else {
      nQuery = nQuery.is('target_programme_id', null);
    }

    const { data: rawNotices } = await nQuery;
    notices = ((rawNotices || []) as unknown as Notice[]).filter(
      (n) => !n.expiry_date || n.expiry_date > nowIso
    );
  }

  // 2. Current semester subjects (strictly scoped to student's enrolled programme + semester)
  let semesterSubjects: Subject[] = [];
  if (profile.programme_id && profile.semester_id) {
    let sQuery = supabase
      .from('subjects')
      .select('*, semester:semesters(id, semester_number, label), specialization:specializations(id, code, name)')
      .eq('publication_status', 'published')
      .eq('programme_id', profile.programme_id)
      .eq('semester_id', profile.semester_id)
      .order('subject_code');

    if (profile.specialization_id) {
      sQuery = sQuery.or(`specialization_id.is.null,specialization_id.eq.${profile.specialization_id}`);
    }

    const { data } = await sQuery;
    semesterSubjects = (data || []) as unknown as Subject[];
  }

  // 3. Latest study materials for student's semester/course
  let latestQuery = supabase
    .from('resources')
    .select(RESOURCE_JOIN)
    .eq('publication_status', 'published')
    .order('created_at', { ascending: false })
    .limit(6);

  if (profile.programme_id) {
    latestQuery = latestQuery.eq('programme_id', profile.programme_id);
  }
  if (profile.semester_id) {
    latestQuery = latestQuery.eq('semester_id', profile.semester_id);
  }
  if (profile.specialization_id) {
    latestQuery = latestQuery.or(
      `specialization_id.is.null,specialization_id.eq.${profile.specialization_id}`
    );
  }

  // 4. Popular resources for student's course
  let popularQuery = supabase
    .from('resources')
    .select(RESOURCE_JOIN)
    .eq('publication_status', 'published')
    .order('download_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  if (profile.programme_id) {
    popularQuery = popularQuery.eq('programme_id', profile.programme_id);
  }

  // 5. Question paper category IDs
  const { data: qpCats } = await supabase
    .from('resource_categories')
    .select('id')
    .eq('is_question_paper', true);
  const qpCatIds = (qpCats || []).map((c) => c.id);

  let qpQuery = supabase
    .from('resources')
    .select(RESOURCE_JOIN)
    .eq('publication_status', 'published')
    .order('created_at', { ascending: false })
    .limit(3);

  if (qpCatIds.length > 0) {
    qpQuery = qpQuery.in('category_id', qpCatIds);
  }
  if (profile.programme_id) {
    qpQuery = qpQuery.eq('programme_id', profile.programme_id);
  }
  if (profile.semester_id) {
    qpQuery = qpQuery.eq('semester_id', profile.semester_id);
  }

  // 6. Recently viewed & Bookmarks
  const [
    { data: latestResources },
    { data: popularResources },
    { data: questionPapers },
    { data: recentRows },
    { data: userBookmarks },
  ] = await Promise.all([
    latestQuery,
    popularQuery,
    qpCatIds.length > 0 ? qpQuery : Promise.resolve({ data: [] }),
    supabase
      .from('recently_viewed')
      .select(`viewed_at, resource:resources(${RESOURCE_JOIN})`)
      .eq('user_id', profile.id)
      .order('viewed_at', { ascending: false })
      .limit(3),
    supabase.from('bookmarks').select('resource_id').eq('user_id', profile.id),
  ]);

  const bookmarkSet = new Set((userBookmarks || []).map((b) => b.resource_id));
  const recentlyViewed = (recentRows || [])
    .map((r) => r.resource as unknown as Resource | null)
    .filter((r): r is Resource => Boolean(r && r.publication_status === 'published'));

  const greeting = getGreetingByHour();
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const hasAcademicSetup = Boolean(profile.programme_id && profile.semester_id);

  return (
    <div className="space-y-9">
      {/* Temporary Password Security Banner */}
      {profile.must_change_password ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-burgundy-border bg-burgundy-tint px-4 py-3.5 text-xs">
          <div className="text-charcoal">
            <span className="font-semibold text-burgundy">One small thing:</span> you’re signed in
            with a temporary password from your administrator. Set your own in Settings.
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-burgundy px-3 py-1.5 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
          >
            <span>Change password</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Personalized Hero Section */}
      <section className="rounded-xl border border-line bg-neutral-soft/60 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {profile.university ? (
                <Badge variant="neutral">{profile.university.short_name}</Badge>
              ) : null}
              {profile.programme ? (
                <Badge variant="burgundy">
                  {profile.programme.name}
                  {profile.specialization ? ` • ${profile.specialization.code}` : ''}
                </Badge>
              ) : null}
              {profile.semester ? (
                <Badge variant="solid">{profile.semester.label}</Badge>
              ) : null}
              {profile.regulation ? (
                <Badge variant="muted">{profile.regulation.name}</Badge>
              ) : null}
            </div>

            <p className="mt-4 text-xs font-medium text-muted">{todayLabel}</p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal">
              {greeting}, {profile.full_name.split(' ')[0]}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {hasAcademicSetup
                ? `Notes and question papers for ${profile.programme?.name}${
                    profile.specialization ? ` (${profile.specialization.name})` : ''
                  } — ${profile.semester?.label}.`
                : 'Add your course and semester to your profile, and your subjects and notes will show up here.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/profile"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-inset transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-burgundy" />
              <span>{hasAcademicSetup ? 'Change course / semester' : 'Set course & semester'}</span>
            </Link>
          </div>
        </div>

        {/* Prominent Global Search */}
        <div className="mt-6">
          <GlobalSearchBar />
        </div>

        {/* Quick-Access Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/semester"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-charcoal hover:border-burgundy-border hover:text-burgundy transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-burgundy" />
            <span>My subjects</span>
          </Link>
          <Link
            href="/dashboard/question-papers"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-charcoal hover:border-burgundy-border hover:text-burgundy transition-colors"
          >
            <FileQuestion className="h-3.5 w-3.5 text-burgundy" />
            <span>Question papers</span>
          </Link>
          <Link
            href="/dashboard/bookmarks"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-charcoal hover:border-burgundy-border hover:text-burgundy transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5 text-burgundy" />
            <span>Saved ({bookmarkSet.size})</span>
          </Link>
          {settings.allow_cross_programme_browsing ? (
            <Link
              href="/dashboard/courses"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-charcoal hover:border-burgundy-border hover:text-burgundy transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 text-burgundy" />
              <span>All programmes</span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Dynamic Notice / Announcement Section (Hidden automatically when disabled or empty) */}
      <NoticeBoard notices={notices} noticesEnabled={settings.notices_enabled} />

      {/* Homepage Advertisement Area (Hidden automatically when disabled) */}
      <AdSlot
        ad={adConfig.byPlacement.homepage_banner}
        adsEnabled={adConfig.adsEnabled}
        requireConsent={adConfig.requireConsent}
      />

      {/* Current Semester Subjects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-charcoal">
              {profile.semester ? `${profile.semester.label} subjects` : 'Your subjects'}
            </h2>
            <p className="text-xs text-muted">
              Pick a subject to see its notes and papers.
            </p>
          </div>
          <Link
            href="/dashboard/semester"
            className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
          >
            <span>View semester</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!hasAcademicSetup ? (
          <EmptyState
            icon={GraduationCap}
            title="First, pick your course"
            description="Choose your programme and semester in your profile — your subjects will appear here."
            action={
              <Link
                href="/dashboard/profile"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
              >
                Go to profile
              </Link>
            }
          />
        ) : semesterSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`No subjects in ${profile.semester?.label} yet`}
            description="Subjects haven’t been added for this semester yet. Check back soon."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {semesterSubjects.map((subj) => (
              <Link
                key={subj.id}
                href={`/dashboard/materials?subjectId=${subj.id}&programmeId=${subj.programme_id}&semesterId=${subj.semester_id}`}
                className="group flex flex-col justify-between rounded-lg border border-line bg-canvas p-4 hover:border-burgundy-border hover:bg-burgundy-tint/35 transition-colors"
              >
                <div>
                  <span className="inline-block rounded border border-burgundy-border bg-burgundy-tint px-2 py-0.5 font-mono text-xs font-semibold text-burgundy">
                    {subj.subject_code}
                  </span>
                  <h3 className="mt-2.5 text-sm font-semibold text-charcoal group-hover:text-burgundy leading-snug">
                    {subj.name}
                  </h3>
                  {subj.description ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted leading-relaxed">
                      {subj.description}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-2.5 text-xs font-medium text-burgundy">
                  <span>Browse materials</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Latest Semester Notes & Uploaded Resources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-charcoal">
              {profile.semester ? `New in ${profile.semester.label}` : 'Recently added'}
            </h2>
            <p className="text-xs text-muted">
              The newest notes and documents for your semester.
            </p>
          </div>
          <Link
            href={
              profile.programme_id
                ? `/dashboard/materials?programmeId=${profile.programme_id}${
                    profile.semester_id ? `&semesterId=${profile.semester_id}` : ''
                  }`
                : '/dashboard/materials'
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!latestResources || latestResources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No materials yet"
            description="When notes are added for your semester, they’ll show up here."
            action={
              <Link
                href="/dashboard/materials?scope=all"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-4 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
              >
                Browse everything
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(latestResources as unknown as Resource[]).map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkSet.has(res.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Previous Question Papers & Popular Course Resources */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Previous Question Papers Quick Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4 text-burgundy" />
              <h2 className="text-base font-semibold text-charcoal">Question papers</h2>
            </div>
            <Link
              href="/dashboard/question-papers"
              className="text-xs font-semibold text-burgundy hover:underline"
            >
              All papers
            </Link>
          </div>

          {!questionPapers || questionPapers.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No papers yet"
              description="Previous years’ papers for your semester will be listed here."
            />
          ) : (
            <div className="space-y-3">
              {(questionPapers as unknown as Resource[]).map((qp) => (
                <Link
                  key={qp.id}
                  href={`/resources/${qp.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4 hover:border-burgundy-border transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {qp.subject ? (
                        <span className="font-mono text-xs font-semibold text-burgundy">
                          {qp.subject.subject_code}
                        </span>
                      ) : null}
                      {qp.academic_year ? (
                        <span className="text-[11px] text-muted">• {qp.academic_year}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-charcoal">{qp.title}</p>
                  </div>
                  <Badge variant="burgundy" className="shrink-0">
                    {qp.file_type}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Popular Course Resources */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-burgundy" />
              <h2 className="text-base font-semibold text-charcoal">Most downloaded</h2>
            </div>
            <Link
              href="/dashboard/materials?sort=popular"
              className="text-xs font-semibold text-burgundy hover:underline"
            >
              See all
            </Link>
          </div>

          {!popularResources || popularResources.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Nothing trending yet"
              description="What students in your programme download most will appear here."
            />
          ) : (
            <div className="space-y-3">
              {(popularResources as unknown as Resource[]).map((item) => (
                <Link
                  key={item.id}
                  href={`/resources/${item.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4 hover:border-burgundy-border transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {item.subject ? (
                        <span className="font-mono text-xs font-semibold text-burgundy">
                          {item.subject.subject_code}
                        </span>
                      ) : null}
                      {item.category ? (
                        <span className="text-[11px] text-muted">• {item.category.name}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-charcoal">{item.title}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {item.download_count} dl
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recently Viewed Materials */}
      {recentlyViewed.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-burgundy" />
              <h2 className="text-base font-semibold text-charcoal">Recently Viewed</h2>
            </div>
            <Link
              href="/dashboard/history"
              className="text-xs font-semibold text-burgundy hover:underline"
            >
              History
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recentlyViewed.map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkSet.has(res.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Dedicated Partner Section Ad Slot (Hidden unless enabled) */}
      <AdSlot
        ad={adConfig.byPlacement.dedicated_partner_section}
        adsEnabled={adConfig.adsEnabled}
        requireConsent={adConfig.requireConsent}
      />
    </div>
  );
}
