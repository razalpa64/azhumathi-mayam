'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  X,
} from 'lucide-react';
import { GlobalSearchBar } from '@/components/student/GlobalSearchBar';
import { ResourceCard } from '@/components/student/ResourceCard';
import { buildSubjectOptions } from '@/lib/subject-options';
import { seededIdSets } from '@/lib/seeded-taxonomy';
import { AdSlot } from '@/components/ads/AdSlot';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type {
  AcademicRegulation,
  Advertisement,
  Profile,
  Programme,
  Resource,
  ResourceCategory,
  Semester,
  Specialization,
  Subject,
  University,
} from '@/types/database';

interface TaxonomyBundle {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
  subjects: Subject[];
  categories: ResourceCategory[];
}

interface MaterialsBrowserClientProps {
  profile: Profile;
  taxonomy: TaxonomyBundle;
  onlyQuestionPapers?: boolean;
  /** 'short-notes' = Short Notes & Exam Special collection */
  collection?: 'short-notes';
  allowCrossProgrammeBrowsing: boolean;
  adsEnabled: boolean;
  requireAdConsent: boolean;
  betweenListingsAd?: Advertisement | null;
  subjectPageAd?: Advertisement | null;
}

export function MaterialsBrowserClient({
  profile,
  taxonomy,
  onlyQuestionPapers = false,
  collection,
  allowCrossProgrammeBrowsing,
  adsEnabled,
  requireAdConsent,
  betweenListingsAd,
  subjectPageAd,
}: MaterialsBrowserClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasExplicitScopeAll = searchParams.get('scope') === 'all';
  const hasExplicitQuery = Boolean(searchParams.get('q'));

  const [universityId, setUniversityId] = useState(
    searchParams.get('universityId') || ''
  );
  const [programmeId, setProgrammeId] = useState(
    searchParams.get('programmeId') ||
      (!hasExplicitScopeAll && !hasExplicitQuery && profile.programme_id ? profile.programme_id : '')
  );
  // Branch baseline: browsing your own programme means your branch
  // (plus shared materials), exactly what "My semester" resets to.
  // Without this, first load mixed every branch's materials into the
  // list while the reset button quietly narrowed it — two different
  // answers for the same view. Explicit cross-programme/subject links
  // and browse-all/search keep the open scope.
  const programmeParam = searchParams.get('programmeId');
  const ownProgrammeContext =
    !programmeParam || programmeParam === profile.programme_id;
  const [specializationId, setSpecializationId] = useState(
    searchParams.get('specializationId') ||
      (!hasExplicitScopeAll &&
      !hasExplicitQuery &&
      ownProgrammeContext &&
      !searchParams.get('subjectId')
        ? profile.specialization_id || ''
        : '')
  );
  const [regulationId, setRegulationId] = useState(
    searchParams.get('regulationId') || ''
  );
  const [semesterId, setSemesterId] = useState(
    searchParams.get('semesterId') ||
      (!hasExplicitScopeAll && !hasExplicitQuery && profile.semester_id && !searchParams.get('programmeId')
        ? profile.semester_id
        : '')
  );
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'latest');
  const [page, setPage] = useState(Number(searchParams.get('page') || '1') || 1);

  const queryParam = searchParams.get('q') || '';

  const [items, setItems] = useState<Resource[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters the student picked on top of their own course defaults
  // (those defaults are the baseline, not "filters").
  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (universityId) {
    const u = taxonomy.universities.find((x) => x.id === universityId);
    activeFilters.push({
      key: 'university',
      label: u?.short_name || 'University',
      clear: () => { setUniversityId(''); setPage(1); },
    });
  }
  if (programmeId && programmeId !== (profile.programme_id || '')) {
    const pr = taxonomy.programmes.find((x) => x.id === programmeId);
    activeFilters.push({
      key: 'programme',
      label: pr?.name || 'Programme',
      clear: () => { setProgrammeId(profile.programme_id || ''); setSpecializationId(''); setSemesterId(profile.semester_id || ''); setSubjectId(''); setPage(1); },
    });
  }
  if (specializationId && specializationId !== (profile.specialization_id || '')) {
    const sp = taxonomy.specializations.find((x) => x.id === specializationId);
    activeFilters.push({
      key: 'specialization',
      label: sp?.code || 'Specialization',
      clear: () => { setSpecializationId(profile.specialization_id || ''); setSubjectId(''); setPage(1); },
    });
  }
  if (semesterId && semesterId !== (profile.semester_id || '')) {
    const sem = taxonomy.semesters.find((x) => x.id === semesterId);
    activeFilters.push({
      key: 'semester',
      label: sem?.label || 'Semester',
      clear: () => { setSemesterId(profile.semester_id || ''); setSubjectId(''); setPage(1); },
    });
  }
  if (subjectId) {
    const sub = taxonomy.subjects.find((x) => x.id === subjectId);
    activeFilters.push({
      key: 'subject',
      label: sub?.subject_code || 'Subject',
      clear: () => { setSubjectId(''); setPage(1); },
    });
  }
  if (categoryId) {
    const cat = taxonomy.categories.find((x) => x.id === categoryId);
    activeFilters.push({
      key: 'type',
      label: cat?.name || 'Type',
      clear: () => { setCategoryId(''); setPage(1); },
    });
  }
  if (regulationId) {
    const reg = taxonomy.regulations.find((x) => x.id === regulationId);
    activeFilters.push({
      key: 'regulation',
      label: reg?.name || 'Regulation',
      clear: () => { setRegulationId(''); setPage(1); },
    });
  }

  const filteredSpecializations = useMemo(
    () =>
      programmeId
        ? taxonomy.specializations.filter((s) => s.programme_id === programmeId)
        : taxonomy.specializations,
    [programmeId, taxonomy.specializations]
  );

  // Only offer programmes/branches that actually have subjects —
  // an unseeded branch can only ever produce an empty list. A
  // selection already in force (e.g. from a dashboard link) stays.
  const seeded = useMemo(() => seededIdSets(taxonomy.subjects), [taxonomy.subjects]);
  const programmeOptions = useMemo(() => {
    const list = taxonomy.programmes.filter((pr) => seeded.programmeIds.has(pr.id));
    return programmeId && !list.some((pr) => pr.id === programmeId)
      ? [...list, ...taxonomy.programmes.filter((pr) => pr.id === programmeId)]
      : list;
  }, [taxonomy.programmes, seeded, programmeId]);
  const specializationOptions = useMemo(() => {
    const list = filteredSpecializations.filter((sp) =>
      seeded.specializationIds.has(sp.id)
    );
    return specializationId && !list.some((sp) => sp.id === specializationId)
      ? [
          ...list,
          ...filteredSpecializations.filter((sp) => sp.id === specializationId),
        ]
      : list;
  }, [filteredSpecializations, seeded, specializationId]);

  const filteredSemesters = useMemo(
    () =>
      programmeId
        ? taxonomy.semesters.filter((s) => s.programme_id === programmeId)
        : taxonomy.semesters,
    [programmeId, taxonomy.semesters]
  );

  const filteredSubjects = useMemo(() => {
    // While browsing your own programme, your own scheme/university is
    // the context: a KTU-2024 student must never see KTU-2019 subjects
    // (or another university's) mixed into this list. Explicit filter
    // choices always win over the profile defaults.
    const ownProgramme =
      Boolean(profile.programme_id) && programmeId === profile.programme_id;
    return buildSubjectOptions(taxonomy.subjects, {
      programmeId,
      semesterId,
      specializationId,
      regulationId:
        regulationId || (ownProgramme ? profile.regulation_id || '' : ''),
      universityId:
        universityId || (ownProgramme ? profile.university_id || '' : ''),
      preferSpecializationId: specializationId || profile.specialization_id || '',
      pinnedSubjectId: subjectId || '',
      collapseAcrossSemesters: !semesterId,
    });
  }, [
    programmeId,
    semesterId,
    specializationId,
    regulationId,
    universityId,
    subjectId,
    profile.programme_id,
    profile.regulation_id,
    profile.university_id,
    profile.specialization_id,
    taxonomy.subjects,
  ]);

  const shortNotesOnly = collection === 'short-notes';
  const SHORT_NOTE_SLUGS = ['short-notes', 'cheat-sheets'];
  const basePath = shortNotesOnly
    ? '/dashboard/short-notes'
    : onlyQuestionPapers
      ? '/dashboard/question-papers'
      : '/dashboard/materials';

  const visibleCategories = useMemo(
    () =>
      shortNotesOnly
        ? taxonomy.categories.filter((c) => c.is_short_note || SHORT_NOTE_SLUGS.includes(c.slug))
        : onlyQuestionPapers
          ? taxonomy.categories.filter((c) => c.is_question_paper)
          : taxonomy.categories,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onlyQuestionPapers, shortNotesOnly, taxonomy.categories]
  );

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (queryParam) sp.set('q', queryParam);
      if (universityId) sp.set('universityId', universityId);
      if (programmeId) sp.set('programmeId', programmeId);
      if (specializationId) sp.set('specializationId', specializationId);
      if (regulationId) sp.set('regulationId', regulationId);
      if (semesterId) sp.set('semesterId', semesterId);
      if (subjectId) sp.set('subjectId', subjectId);
      if (categoryId) sp.set('categoryId', categoryId);
      if (onlyQuestionPapers) sp.set('onlyQuestionPapers', 'true');
      if (shortNotesOnly) sp.set('collection', 'short-notes');
      sp.set('sort', sort);
      sp.set('page', String(page));
      sp.set('pageSize', '12');

      const res = await fetch(`/api/resources?${sp.toString()}`, {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setBookmarkedIds(new Set(data.bookmarkedIds || []));
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [
    queryParam,
    universityId,
    programmeId,
    specializationId,
    regulationId,
    semesterId,
    subjectId,
    categoryId,
    onlyQuestionPapers,
    shortNotesOnly,
    sort,
    page,
  ]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  function handleResetToMyCourse() {
    setUniversityId('');
    setProgrammeId(profile.programme_id || '');
    setSpecializationId(profile.specialization_id || '');
    setRegulationId('');
    setSemesterId(profile.semester_id || '');
    setSubjectId('');
    setCategoryId('');
    setSort('latest');
    setPage(1);
    router.replace(basePath);
  }

  function handleBrowseAll() {
    setUniversityId('');
    setProgrammeId('');
    setSpecializationId('');
    setRegulationId('');
    setSemesterId('');
    setSubjectId('');
    setCategoryId('');
    setPage(1);
    router.replace(
      `${basePath}?scope=all`
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
              {shortNotesOnly
                ? 'Short Notes & Exam Special'
                : onlyQuestionPapers
                  ? 'Question papers'
                  : 'Study materials'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {shortNotesOnly
                ? 'Short notes and cheat sheets for last-minute revision. Small files, big marks.'
                : onlyQuestionPapers
                  ? 'Previous years’ papers, model papers and question banks, by subject.'
                  : 'Notes, lab manuals, presentations and references for your subjects.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile.programme_id ? (
              <Button variant="secondary" size="sm" onClick={handleResetToMyCourse}>
                My semester ({profile.programme?.name}
                {profile.semester ? ` • S${profile.semester.semester_number}` : ''})
              </Button>
            ) : null}
            {allowCrossProgrammeBrowsing ? (
              <Button variant="subtle" size="sm" onClick={handleBrowseAll}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>All programmes</span>
              </Button>
            ) : null}
          </div>
        </div>

        <GlobalSearchBar initialQuery={queryParam} />
      </div>

      {/* Subject-specific Ad Slot */}
      {subjectId ? (
        <AdSlot
          ad={subjectPageAd}
          adsEnabled={adsEnabled}
          requireConsent={requireAdConsent}
        />
      ) : null}

      {/* Filter bar — the matrix stays shut until asked for */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="resource-filters-panel"
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-all active:scale-95 cursor-pointer',
              filtersOpen || activeFilters.length > 0
                ? 'border-burgundy bg-burgundy text-white shadow-[0_10px_18px_-10px_rgba(121,0,0,0.7)]'
                : 'border-line-strong bg-canvas text-charcoal hover:border-burgundy-border hover:text-burgundy'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilters.length > 0 ? (
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                  filtersOpen || activeFilters.length > 0
                    ? 'bg-white text-burgundy'
                    : 'bg-burgundy text-white'
                )}
              >
                {activeFilters.length}
              </span>
            ) : null}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-300', filtersOpen && 'rotate-180')}
            />
          </button>

          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-burgundy-tint py-1 pl-3 pr-1.5 text-xs font-medium text-burgundy ring-1 ring-burgundy-border"
            >
              {f.label}
              <button
                type="button"
                onClick={f.clear}
                aria-label={`Remove ${f.label} filter`}
                className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-burgundy hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {activeFilters.length > 0 ? (
            <button
              type="button"
              onClick={handleResetToMyCourse}
              className="h-8 px-2 text-xs font-semibold text-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-burgundy cursor-pointer"
            >
              Clear all
            </button>
          ) : null}

          <span className="ml-auto text-xs text-muted">
            {loading ? 'Loading…' : `${total} found`}
          </span>
        </div>

        {/* Collapsible filter matrix */}
        <div
          id="resource-filters-panel"
          inert={!filtersOpen}
          className={cn(
            'grid transition-all duration-300 ease-out',
            filtersOpen ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <section
              aria-label="Resource filters"
              className="rounded-[20px] border border-line bg-neutral-soft/65 p-4 lg:rounded-[26px] lg:p-6"
            >
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:gap-4">
                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">University</label>
                  <select
                    value={universityId}
                    onChange={(e) => { setUniversityId(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="">Any university</option>
                    {taxonomy.universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.short_name} — {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Programme</label>
                  <select
                    value={programmeId}
                    disabled={!allowCrossProgrammeBrowsing && Boolean(profile.programme_id)}
                    onChange={(e) => {
                      setProgrammeId(e.target.value);
                      setSpecializationId('');
                      setSemesterId('');
                      setSubjectId('');
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px] disabled:opacity-60"
                  >
                    <option value="">Any programme</option>
                    {programmeOptions.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name} {pr.full_title ? `— ${pr.full_title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Specialization</label>
                  <select
                    value={specializationId}
                    onChange={(e) => { setSpecializationId(e.target.value); setSubjectId(''); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="">Any specialization</option>
                    {specializationOptions.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.code} — {sp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Semester</label>
                  <select
                    value={semesterId}
                    onChange={(e) => { setSemesterId(e.target.value); setSubjectId(''); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="">Any semester</option>
                    {filteredSemesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="">Any subject</option>
                    {filteredSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subject_code} — {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Type</label>
                  <select
                    value={categoryId}
                    onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="">Any type</option>
                    {visibleCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Regulation</label>
                  <select
                    value={regulationId}
                    onChange={(e) => { setRegulationId(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="">All Regulations</option>
                    {taxonomy.regulations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block pl-1 text-[11px] font-medium text-muted">Sort</label>
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-full border border-line-strong bg-canvas px-3.5 text-xs text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:px-4 lg:text-[13px]"
                  >
                    <option value="latest">Newest first</option>
                    <option value="popular">Most downloaded</option>
                    <option value="title">Title (A – Z)</option>
                  </select>
                </div>
              </div>

              <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-[11px] text-muted">
                <span>
                  Showing {loading ? '…' : total} result{total === 1 ? '' : 's'} — tap{' '}
                  <span className="font-semibold text-charcoal">Filters</span> again to close this.
                </span>
                {activeFilters.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleResetToMyCourse}
                    className="font-semibold text-burgundy underline decoration-burgundy-border underline-offset-2 cursor-pointer"
                  >
                    Reset to my course
                  </button>
                ) : null}
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-52 animate-pulse rounded-lg border border-line bg-neutral-soft lg:rounded-[26px]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing matches"
          description="Try removing a filter or two — or browse everything."
          action={
            allowCrossProgrammeBrowsing ? (
              <Button variant="secondary" size="sm" onClick={handleBrowseAll}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.slice(0, 6).map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkedIds.has(res.id)}
              />
            ))}
          </div>

          {/* Between-listings Ad Placement (strictly separated from study cards) */}
          {items.length > 3 ? (
            <AdSlot
              ad={betweenListingsAd}
              adsEnabled={adsEnabled}
              requireConsent={requireAdConsent}
            />
          ) : null}

          {items.length > 6 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.slice(6).map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  initialBookmarked={bookmarkedIds.has(res.id)}
                />
              ))}
            </div>
          ) : null}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-muted">
                Page <span className="font-semibold text-charcoal">{page}</span> of{' '}
                <span className="font-semibold text-charcoal">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
