import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowRight,
  Bookmark,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  FileQuestion,
  FileText,
  GraduationCap,
  Inbox,
  Layers,
  LifeBuoy,
  NotebookPen,
  TrendingUp,
  Zap,
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

  // 1. Active notices (global or targeted to student's programme).
  //    Fired now and awaited in the batch below — no query queues behind another.
  const noticesPromise: Promise<Notice[]> = (async () => {
    if (!settings.notices_enabled) return [];
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
    return ((rawNotices || []) as unknown as Notice[]).filter(
      (n) => !n.expiry_date || n.expiry_date > nowIso
    );
  })();

  // 2. Current semester subjects (strictly scoped to student's programme + semester)
  const subjectsPromise: Promise<Subject[]> = (async () => {
    if (!(profile.programme_id && profile.semester_id)) return [];
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

    // Never mix schemes or universities into a student's subject list;
    // NULL regulation/university marks a shared subject that always shows.
    if (profile.regulation_id) {
      sQuery = sQuery.or(`regulation_id.is.null,regulation_id.eq.${profile.regulation_id}`);
    }
    if (profile.university_id) {
      sQuery = sQuery.or(`university_id.is.null,university_id.eq.${profile.university_id}`);
    }

    const { data } = await sQuery;
    return (data || []) as unknown as Subject[];
  })();

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

  // 5b. Short Notes & Exam Special (latest for this semester)
  const snByFlag = await supabase
    .from('resource_categories')
    .select('id')
    .eq('is_short_note', true);
  const snCats = !snByFlag.error
    ? snByFlag.data
    : (
        await supabase
          .from('resource_categories')
          .select('id')
          .in('slug', ['short-notes', 'cheat-sheets'])
      ).data;
  const snCatIds = (snCats || []).map((c) => c.id);

  let shortNotesQuery = supabase
    .from('resources')
    .select(RESOURCE_JOIN)
    .eq('publication_status', 'published')
    .order('created_at', { ascending: false })
    .limit(3);
  if (snCatIds.length > 0) shortNotesQuery = shortNotesQuery.in('category_id', snCatIds);
  if (profile.programme_id) shortNotesQuery = shortNotesQuery.eq('programme_id', profile.programme_id);
  if (profile.semester_id) shortNotesQuery = shortNotesQuery.eq('semester_id', profile.semester_id);

  // 5c. Per-subject material counts (for the subject cards)
  let subjectCountQuery = supabase
    .from('resources')
    .select('subject_id, created_at, category:resource_categories(is_question_paper), subject:subjects(subject_code, regulation_id)')
    .eq('publication_status', 'published')
    .limit(1000);
  if (profile.programme_id) subjectCountQuery = subjectCountQuery.eq('programme_id', profile.programme_id);
  if (profile.semester_id) subjectCountQuery = subjectCountQuery.eq('semester_id', profile.semester_id);

  // 6. Recently viewed & Bookmarks
  const [
    notices,
    semesterSubjects,
    { data: latestResources },
    { data: popularResources },
    { data: questionPapers },
    { data: recentRows },
    { data: userBookmarks },
    { data: shortNoteResources },
    { data: subjectCountRows },
  ] = await Promise.all([
    noticesPromise,
    subjectsPromise,
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
    snCatIds.length > 0 ? shortNotesQuery : Promise.resolve({ data: [] }),
    subjectCountQuery,
  ]);

  // Aggregate counts per subject
  // Counts are aggregated per COURSE (subject_code + scheme), not per
  // subject row: a course shared by several branches is stored once per
  // branch, and a note uploaded against any branch's copy must count on
  // every branch's card for that course.
  const subjectStats = new Map<string, { notes: number; qps: number; updated: string | null }>();
  for (const row of (subjectCountRows || []) as unknown as {
    subject_id: string;
    created_at: string;
    category: { is_question_paper: boolean } | null;
    subject: { subject_code: string; regulation_id: string | null } | null;
  }[]) {
    if (!row.subject) continue;
    const key = `${row.subject.subject_code}|${row.subject.regulation_id ?? ''}`;
    const entry = subjectStats.get(key) || { notes: 0, qps: 0, updated: null };
    if (row.category?.is_question_paper) entry.qps += 1;
    else entry.notes += 1;
    if (!entry.updated || row.created_at > entry.updated) entry.updated = row.created_at;
    subjectStats.set(key, entry);
  }
  const monthLabel = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso))
      : null;

  const contextBits = [
    profile.university?.short_name,
    profile.programme?.name,
    profile.specialization?.code,
    profile.semester?.label,
  ].filter(Boolean) as string[];

  const bookmarkSet = new Set((userBookmarks || []).map((b) => b.resource_id));
  const recentlyViewed = (recentRows || [])
    .map((r) => r.resource as unknown as Resource | null)
    .filter((r): r is Resource => Boolean(r && r.publication_status === 'published'));

  const greeting = getGreetingByHour();
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const hasAcademicSetup = Boolean(profile.programme_id && profile.semester_id);

  return (
    <div className="space-y-10 sm:space-y-12 lg:space-y-7">
      {/* Temporary Password Security Banner */}
      {profile.must_change_password ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-burgundy-border bg-burgundy-tint px-4 py-3.5 text-xs">
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

      {/* Greeting hero — deep burgundy card with cap watermark */}
      <section className="anim-rise relative overflow-hidden rounded-[32px] bg-gradient-to-br from-burgundy via-burgundy-dark to-burgundy-deep p-6 text-canvas shadow-[0_20px_38px_-18px_rgba(36,7,7,0.6)] sm:p-8 lg:overflow-visible lg:rounded-[28px] lg:px-8 lg:py-6 xl:px-10">
        {/* Decorations live in a clipped layer of their own, so the hero
            itself can stay open on desktop for the search dropdown */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1.4px)] [background-size:22px_22px] [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="absolute -top-32 right-48 hidden h-64 w-64 rounded-full bg-white/[0.07] blur-2xl lg:block" />
        <GraduationCap
          aria-hidden="true"
          strokeWidth={1}
          className="pointer-events-none absolute -top-6 right-3 h-36 w-36 rotate-[-10deg] text-white/10 sm:right-10 sm:h-48 sm:w-48 lg:-top-6 lg:right-10 lg:h-44 lg:w-44"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-white/[0.06] lg:h-64 lg:w-64"
        />
        </div>

        <div className="relative lg:flex lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {contextBits.length > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3.5 py-1.5 text-[11px] font-semibold text-canvas ring-1 ring-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                {contextBits.join(' • ')}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3.5 text-[27px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[34px] lg:mt-3 lg:text-[28px] lg:leading-[1.12] xl:text-[30px]">
            {greeting}, {profile.full_name.split(' ')[0]}
          </h1>
          <div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-canvas/75 lg:mt-2 lg:max-w-xl lg:text-sm">
            {hasAcademicSetup
              ? `Notes and question papers for ${profile.programme?.name}${profile.specialization ? ` (${profile.specialization.name})` : ''} — ${profile.semester?.label}.`
              : 'Add your course and semester to your profile, and your subjects and notes will show up here.'}
          </p>

          <Link
            href="/dashboard/profile"
            className={`mt-5 inline-flex items-center gap-2.5 rounded-full bg-white py-2.5 pl-4 pr-3 text-sm font-semibold text-burgundy shadow-[0_14px_24px_-12px_rgba(0,0,0,0.55)] transition-transform hover:scale-[1.02] lg:mt-4 lg:bg-white/10 lg:py-2 lg:pl-3.5 lg:pr-3 lg:text-white lg:shadow-none lg:ring-1 lg:ring-white/30 ${hasAcademicSetup ? 'lg:hidden' : ''}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>{hasAcademicSetup ? 'Change course / semester' : 'Set course & semester'}</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </Link>
          </div>
          </div>

          {/* At a glance — date and quick counts, top-right on desktop */}
          {hasAcademicSetup ? (
            <div className="hidden shrink-0 lg:block">
              <p className="mb-3 text-right text-xs font-medium tracking-wide text-white/55">
                {dateLabel}
              </p>
              <div className="grid grid-cols-3 gap-3">
              {[
                { value: String(semesterSubjects.length), prefix: '', label: 'Subjects', icon: BookOpen },
                { value: String(bookmarkSet.size), prefix: '', label: 'Saved', icon: Bookmark },
                {
                  value: profile.semester ? String(profile.semester.semester_number) : '—',
                  prefix: profile.semester ? 'S' : '',
                  label: 'Semester',
                  icon: GraduationCap,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[106px] rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/15 lg:min-w-[98px] lg:px-3.5 lg:py-2.5"
                >
                  <p className="text-[26px] font-extrabold leading-none text-white lg:text-[22px]">
                    {stat.prefix ? (
                      <span className="mr-0.5 text-[15px] font-bold text-white/70 lg:text-[13px]">
                        {stat.prefix}
                      </span>
                    ) : null}
                    {stat.value}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    <stat.icon className="h-3 w-3" aria-hidden="true" />
                    {stat.label}
                  </p>
                </div>
              ))}
              </div>
              <div className="mt-3 text-right">
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 py-2 pl-3.5 pr-3 text-[13px] font-semibold text-white ring-1 ring-white/30 transition-transform hover:scale-[1.02]"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Change course / semester</span>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* On desktop the search lives inside the hero — one working band
            instead of a billboard hero plus a separate search row */}
        <div className="relative z-20 mt-6 hidden lg:block">
          <GlobalSearchBar />
        </div>
      </section>

      {/* Search row — phones and tablets; on desktop it sits in the hero */}
      <div className="anim-rise lg:hidden" style={{ animationDelay: '60ms' }}>
        <GlobalSearchBar />
      </div>

      {/* Quick actions */}
      <div className="anim-rise grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: '170ms' }}>
        {[
          { href: '/dashboard/semester', label: 'My subjects', icon: Layers },
          { href: '/dashboard/question-papers', label: 'Question papers', icon: FileQuestion },
          { href: '/dashboard/short-notes', label: 'Short notes', icon: NotebookPen },
          { href: '/dashboard/bookmarks', label: `Saved (${bookmarkSet.size})`, icon: Bookmark },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-[20px] border border-line bg-canvas px-4 py-3.5 transition-colors hover:border-burgundy-border sm:px-5 lg:rounded-[20px] lg:px-5 lg:py-3.5 lg:transition-all lg:hover:-translate-y-0.5 lg:hover:shadow-[0_16px_28px_-20px_rgba(36,7,7,0.4)]"
            >
              <span className="lg:flex lg:h-9 lg:w-9 lg:shrink-0 lg:items-center lg:justify-center lg:rounded-xl lg:bg-burgundy-tint">
                <Icon className="h-6 w-6 shrink-0 text-burgundy lg:h-5 lg:w-5" strokeWidth={1.8} />
              </span>
              <span className="truncate text-sm font-semibold text-charcoal group-hover:text-burgundy sm:text-[15px] lg:text-[15px]">
                {item.label}
              </span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted/60 transition-all group-hover:translate-x-0.5 group-hover:text-burgundy" />
            </Link>
          );
        })}
      </div>

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
            <h2 className="text-xl font-bold tracking-tight text-charcoal lg:text-[20px]">
              {profile.semester ? `${profile.semester.label} subjects` : 'Your subjects'}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {semesterSubjects.map((subj) => {
              const stats =
                subjectStats.get(`${subj.subject_code}|${subj.regulation_id ?? ''}`) || {
                  notes: 0,
                  qps: 0,
                  updated: null,
                };
              const updatedLabel = monthLabel(stats.updated);
              return (
                <Link
                  key={subj.id}
                  href={`/dashboard/materials?subjectId=${subj.id}&programmeId=${subj.programme_id}&semesterId=${subj.semester_id}`}
                  className="group relative flex flex-col overflow-hidden rounded-[24px] border border-line bg-canvas p-5 transition-colors hover:border-burgundy-border lg:p-5"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-14 -right-14 h-40 w-40 rounded-full bg-[#F7E4E1]"
                  />
                  <div className="relative">
                    <span className="inline-block rounded-full bg-[#F8E7E5] px-3 py-1 text-[11px] font-bold tracking-wide text-burgundy">
                      {subj.subject_code}
                    </span>
                    <h3 className="mt-3 line-clamp-2 text-[17px] font-bold leading-snug text-charcoal transition-colors group-hover:text-burgundy">
                      {subj.name}
                    </h3>
                    {subj.description ? (
                      <p className="mt-1.5 line-clamp-2 pr-8 text-[13px] leading-relaxed text-muted">
                        {subj.description}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 pr-12 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-burgundy/70" />
                        {stats.notes} notes
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileQuestion className="h-3.5 w-3.5 text-burgundy/70" />
                        {stats.qps} QP{stats.qps === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {updatedLabel ? `Updated ${updatedLabel}` : 'No files yet'}
                      </span>
                    </div>
                  </div>
                  <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center lg:h-10 lg:w-10 rounded-full bg-burgundy text-canvas shadow-[0_10px_18px_-8px_rgba(121,0,0,0.8)] transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Short Notes & Exam Special */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy text-canvas">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-charcoal lg:text-[20px]">Short notes &amp; exam special</h2>
              <p className="mt-0.5 text-[13px] text-muted">The night-before-the-exam stuff.</p>
            </div>
          </div>
          <Link
            href="/dashboard/short-notes"
            className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
          >
            <span>All short notes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!shortNoteResources || shortNoteResources.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-line-strong bg-neutral-soft/40 px-5 py-8 text-center">
            <p className="text-sm font-medium text-charcoal">
              No short notes for {profile.semester?.label || 'your semester'} yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
              Exam week coming up? Tell us the subject — short notes are exactly the kind of
              thing we make on request.
            </p>
            <Link
              href="/dashboard/requests"
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Request short notes</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(shortNoteResources as unknown as Resource[]).map((res, i) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkSet.has(res.id)}
                index={i}
              />
            ))}
          </div>
        )}
      </section>

      {/* Latest Semester Notes & Uploaded Resources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-charcoal lg:text-[20px]">
              {profile.semester ? `New in ${profile.semester.label}` : 'Recently added'}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(latestResources as unknown as Resource[]).map((res, i) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkSet.has(res.id)}
                index={i}
              />
            ))}
          </div>
        )}
      </section>

      {/* Request banner */}
      <section className="flex flex-col gap-3 rounded-[22px] bg-burgundy-tint/70 px-5 py-4 sm:flex-row sm:items-center lg:rounded-[24px] lg:px-6 lg:py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-burgundy text-canvas">
          <Inbox className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-charcoal">Can’t find what you need?</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            A missing module, a paper from a year that isn’t here, a cheat sheet before the
            exam — ask. We actually read these.
          </p>
        </div>
        <Link
          href="/dashboard/requests"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-canvas transition-colors hover:bg-burgundy-dark"
        >
          <span>Make a request</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
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
            <div className="divide-y divide-line border-y border-line lg:overflow-hidden lg:rounded-[22px] lg:border lg:bg-canvas lg:px-5">
              {(questionPapers as unknown as Resource[]).map((qp) => (
                <Link
                  key={qp.id}
                  href={`/resources/${qp.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-burgundy-tint/50 lg:py-3.5"
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
            <div className="divide-y divide-line border-y border-line lg:overflow-hidden lg:rounded-[22px] lg:border lg:bg-canvas lg:px-5">
              {(popularResources as unknown as Resource[]).map((item) => (
                <Link
                  key={item.id}
                  href={`/resources/${item.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-burgundy-tint/50 lg:py-3.5"
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
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {recentlyViewed.map((res, i) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkSet.has(res.id)}
                index={i}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Help line */}
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1 text-center text-[13px] text-muted">
        <LifeBuoy className="h-4 w-4 text-burgundy" />
        <span>Stuck with something?</span>
        <Link href="/dashboard/help" className="font-semibold text-burgundy hover:underline">
          Visit Help — call, WhatsApp or mail us
        </Link>
      </p>

      {/* Dedicated Partner Section Ad Slot (Hidden unless enabled) */}
      <AdSlot
        ad={adConfig.byPlacement.dedicated_partner_section}
        adsEnabled={adConfig.adsEnabled}
        requireConsent={adConfig.requireConsent}
      />
    </div>
  );
}
