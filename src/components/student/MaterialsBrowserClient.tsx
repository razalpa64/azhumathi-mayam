'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { GlobalSearchBar } from '@/components/student/GlobalSearchBar';
import { ResourceCard } from '@/components/student/ResourceCard';
import { AdSlot } from '@/components/ads/AdSlot';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
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
  const [specializationId, setSpecializationId] = useState(
    searchParams.get('specializationId') || ''
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

  const filteredSpecializations = useMemo(
    () =>
      programmeId
        ? taxonomy.specializations.filter((s) => s.programme_id === programmeId)
        : taxonomy.specializations,
    [programmeId, taxonomy.specializations]
  );

  const filteredSemesters = useMemo(
    () =>
      programmeId
        ? taxonomy.semesters.filter((s) => s.programme_id === programmeId)
        : taxonomy.semesters,
    [programmeId, taxonomy.semesters]
  );

  const filteredSubjects = useMemo(() => {
    return taxonomy.subjects.filter((s) => {
      if (programmeId && s.programme_id !== programmeId) return false;
      if (semesterId && s.semester_id !== semesterId) return false;
      if (
        specializationId &&
        s.specialization_id &&
        s.specialization_id !== specializationId
      ) {
        return false;
      }
      return true;
    });
  }, [programmeId, semesterId, specializationId, taxonomy.subjects]);

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
        ? taxonomy.categories.filter((c) => SHORT_NOTE_SLUGS.includes(c.slug))
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
            <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
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

      {/* Structured Filter Matrix */}
      <section
        aria-label="Resource filters"
        className="rounded-lg border border-line bg-neutral-soft/65 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal">
            <Filter className="h-3.5 w-3.5 text-burgundy" />
            <span>Filters</span>
          </div>
          <span className="text-xs font-mono text-muted">
            {loading ? 'Loading...' : `${total} found`}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted">University</label>
            <select
              value={universityId}
              onChange={(e) => {
                setUniversityId(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-medium text-muted">Programme</label>
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
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-60"
            >
              <option value="">Any programme</option>
              {taxonomy.programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.full_title ? `— ${p.full_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted">Specialization</label>
            <select
              value={specializationId}
              onChange={(e) => {
                setSpecializationId(e.target.value);
                setSubjectId('');
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
            >
              <option value="">Any specialization</option>
              {filteredSpecializations.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.code} — {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted">Semester</label>
            <select
              value={semesterId}
              onChange={(e) => {
                setSemesterId(e.target.value);
                setSubjectId('');
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-medium text-muted">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-medium text-muted">Type</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
            >
              <option value="">
                {onlyQuestionPapers ? 'Any type' : 'Any type'}
              </option>
              {visibleCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted">Regulation</label>
            <select
              value={regulationId}
              onChange={(e) => {
                setRegulationId(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-medium text-muted">Sort</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
            >
              <option value="latest">Newest first</option>
              <option value="popular">Most downloaded</option>
              <option value="title">Title (A – Z)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Results Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-52 animate-pulse rounded-lg border border-line bg-neutral-soft"
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
