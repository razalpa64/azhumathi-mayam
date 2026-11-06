import Link from 'next/link';
import { BookOpen, GraduationCap } from 'lucide-react';
import { requireStudentAppUser, getWebsiteSettings } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveAdvertisementsByPlacement } from '@/lib/ads';
import { GlobalSearchBar } from '@/components/student/GlobalSearchBar';
import { NoticeBoard } from '@/components/student/NoticeBoard';
import { ResourceCard } from '@/components/student/ResourceCard';
import { AdSlot } from '@/components/ads/AdSlot';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/PageHeader';
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
  const hasAcademicSetup = Boolean(profile.programme_id && profile.semester_id);

  return (
    <div>
      {profile.must_change_password ? (
        <p className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-burgundy-tint px-4 py-3 text-[13px] text-charcoal">
          <span>
            You&rsquo;re using a temporary password.{' '}
            <Link href="/dashboard/settings" className="font-semibold text-burgundy hover:underline underline-offset-4">
              Set your own →
            </Link>
          </span>
        </p>
      ) : null}

      {/* Greeting — no box, just type and a search */}
      <section className="max-w-2xl">
        {hasAcademicSetup ? (
          <p className="text-[13px] font-medium text-muted">
            {profile.programme?.name}
            {profile.specialization ? ` · ${profile.specialization.name}` : ''}
            {profile.semester ? (
              <>
                {' · '}
                <span className="text-burgundy">{profile.semester.label}</span>
              </>
            ) : null}
            {profile.university ? ` · ${profile.university.short_name}` : null}
          </p>
        ) : null}
        <h1 className="font-display mt-2 text-[34px] font-medium leading-[1.12] text-charcoal sm:text-[40px]">
          {greeting}, {profile.full_name.split(' ')[0]}.
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
          {hasAcademicSetup
            ? 'Here’s what’s new for your semester.'
            : 'Tell us your course and semester, and we’ll keep your notes in one place.'}
        </p>

        <div className="mt-6">
          <GlobalSearchBar />
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13.5px]">
          <Link href="/dashboard/semester" className="font-medium text-charcoal/80 hover:text-burgundy">
            My subjects
          </Link>
          <Link href="/dashboard/question-papers" className="font-medium text-charcoal/80 hover:text-burgundy">
            Question papers
          </Link>
          <Link href="/dashboard/bookmarks" className="font-medium text-charcoal/80 hover:text-burgundy">
            Saved{bookmarkSet.size > 0 ? ` (${bookmarkSet.size})` : ''}
          </Link>
          {!hasAcademicSetup ? (
            <Link href="/dashboard/profile" className="font-semibold text-burgundy hover:underline underline-offset-4">
              Set course &amp; semester →
            </Link>
          ) : null}
        </p>
      </section>

      <NoticeBoard notices={notices} noticesEnabled={settings.notices_enabled} />

      <AdSlot
        ad={adConfig.byPlacement.homepage_banner}
        adsEnabled={adConfig.adsEnabled}
        requireConsent={adConfig.requireConsent}
      />

      {/* Subjects */}
      <section className="mt-14">
        <SectionHeader
          title={profile.semester ? `${profile.semester.label} subjects` : 'Your subjects'}
          href="/dashboard/semester"
          linkLabel="All subjects"
        />
        <div className="mt-5">
          {!hasAcademicSetup ? (
            <EmptyState
              icon={GraduationCap}
              title="First, pick your course"
              description="Choose your programme and semester in your profile — your subjects will show up here."
              action={
                <Link
                  href="/dashboard/profile"
                  className="inline-flex h-10 items-center rounded-lg bg-burgundy px-5 text-sm font-semibold text-paper hover:bg-burgundy-dark"
                >
                  Go to profile
                </Link>
              }
            />
          ) : semesterSubjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nothing here yet"
              description={`Subjects for ${profile.semester?.label} haven’t been added yet. Check back soon.`}
            />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {semesterSubjects.map((subj) => (
                <Link
                  key={subj.id}
                  href={`/dashboard/materials?subjectId=${subj.id}&programmeId=${subj.programme_id}&semesterId=${subj.semester_id}`}
                  className="group rounded-xl border border-line bg-paper p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_-16px_rgba(33,26,22,0.28)]"
                >
                  <p className="font-mono text-[13px] font-semibold text-burgundy">{subj.subject_code}</p>
                  <h3 className="mt-2 text-[15px] font-semibold leading-snug text-charcoal group-hover:text-burgundy">
                    {subj.name}
                  </h3>
                  {subj.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{subj.description}</p>
                  ) : null}
                  <p className="mt-4 text-[13px] font-medium text-muted group-hover:text-burgundy">
                    Notes &amp; papers <span aria-hidden="true">→</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New material + side rail */}
      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <section>
          <SectionHeader
            title="New for your semester"
            href={
              profile.programme_id
                ? `/dashboard/materials?programmeId=${profile.programme_id}${profile.semester_id ? `&semesterId=${profile.semester_id}` : ''}`
                : '/dashboard/materials'
            }
            linkLabel="Browse all"
          />
          <div className="mt-5">
            {!latestResources || latestResources.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No materials yet"
                description="When notes are added for your semester, they’ll appear here."
                action={
                  <Link
                    href="/dashboard/materials?scope=all"
                    className="text-sm font-semibold text-burgundy hover:underline underline-offset-4"
                  >
                    Browse everything →
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {(latestResources as unknown as Resource[]).map((res) => (
                  <ResourceCard key={res.id} resource={res} initialBookmarked={bookmarkSet.has(res.id)} />
                ))}
              </div>
            )}
          </div>

          {recentlyViewed.length > 0 ? (
            <div className="mt-12">
              <SectionHeader title="Recently opened" href="/dashboard/history" linkLabel="History" />
              <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
                {recentlyViewed.slice(0, 2).map((res) => (
                  <ResourceCard key={res.id} resource={res} initialBookmarked={bookmarkSet.has(res.id)} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Rail: question papers + most downloaded, as plain lists */}
        <div className="space-y-12">
          <section>
            <SectionHeader title="Question papers" href="/dashboard/question-papers" linkLabel="All papers" />
            <div className="mt-4">
              {!questionPapers || questionPapers.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  No papers yet for this semester. Previous years&rsquo; papers will be listed here.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {(questionPapers as unknown as Resource[]).map((qp) => (
                    <li key={qp.id}>
                      <Link href={`/resources/${qp.id}`} className="group block py-3.5">
                        <p className="text-[13px] text-muted">
                          {qp.subject ? (
                            <span className="font-mono font-semibold text-burgundy">{qp.subject.subject_code}</span>
                          ) : null}
                          {qp.academic_year ? <span> · {qp.academic_year}</span> : null}
                        </p>
                        <p className="mt-0.5 text-[14.5px] font-medium leading-snug text-charcoal group-hover:text-burgundy">
                          {qp.title}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <SectionHeader title="Most downloaded" href="/dashboard/materials?sort=popular" linkLabel="Top downloads" />
            <div className="mt-4">
              {!popularResources || popularResources.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  Nothing trending yet — downloads from your programme will show up here.
                </p>
              ) : (
                <ol className="divide-y divide-line">
                  {(popularResources as unknown as Resource[]).map((item, i) => (
                    <li key={item.id}>
                      <Link href={`/resources/${item.id}`} className="group flex items-baseline gap-3 py-3.5">
                        <span className="font-display text-[15px] text-burgundy/60">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14.5px] font-medium text-charcoal group-hover:text-burgundy">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {item.subject?.subject_code ? `${item.subject.subject_code} · ` : ''}
                            {item.download_count} downloads
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </div>

      <AdSlot
        ad={adConfig.byPlacement.dedicated_partner_section}
        adsEnabled={adConfig.adsEnabled}
        requireConsent={adConfig.requireConsent}
      />
    </div>
  );
}
