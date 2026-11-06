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

  const hasActiveFilters = Boolean(
    universityId || programmeId || specializationId || regulationId || semesterId || subjectId || categoryId
  );
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

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

  const visibleCategories = useMemo(
    () =>
      onlyQuestionPapers
        ? taxonomy.categories.filter((c) => c.is_question_paper)
        : taxonomy.categories,
    [onlyQuestionPapers, taxonomy.categories]
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
    router.replace(onlyQuestionPapers ? '/dashboard/question-papers' : '/dashboard/materials');
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
      `${onlyQuestionPapers ? '/dashboard/question-papers' : '/dashboard/materials'}?scope=all`
    );
  }

  const activeFilterCount = [
    universityId,
    programmeId,
    specializationId,
    regulationId,
    semesterId,
    subjectId,
    categoryId,
  ].filter(Boolean).length;

  return (
    <div>
      {/* Header & Search */}
      <div className="max-w-2xl">
        <h1 className="font-display text-[28px] font-medium leading-tight text-charcoal sm:text-[32px]">
          {onlyQuestionPapers ? 'Question papers' : 'Materials'}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {onlyQuestionPapers
            ? 'Previous years’ papers and question banks, by subject.'
            : 'Notes, manuals and references for your subjects.'}
        </p>
        <div className="mt-5">
          <GlobalSearchBar initialQuery={queryParam} />
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13.5px]">
          {profile.programme_id ? (
            <button
              type="button"
              onClick={handleResetToMyCourse}
              className="font-medium text-charcoal/80 hover:text-burgundy cursor-pointer"
            >
              My semester
              {profile.semester ? ` (${profile.semester.label})` : ''}
            </button>
          ) : null}
          {allowCrossProgrammeBrowsing ? (
            <button
              type="button"
              onClick={handleBrowseAll}
              className="inline-flex items-center gap-1.5 font-medium text-charcoal/80 hover:text-burgundy cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Everything
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="inline-flex items-center gap-1.5 font-semibold text-burgundy hover:underline underline-offset-4 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <span className="text-muted">
            {loading ? 'Loading…' : `${total} ${total === 1 ? 'item' : 'items'}`}
          </span>
        </p>
      </div>

      {/* Subject-specific Ad Slot */}
      {subjectId ? (
        <AdSlot
          ad={subjectPageAd}
          adsEnabled={adsEnabled}
          requireConsent={requireAdConsent}
        />
      ) : null}

      {/* Filters — tucked away until asked for */}
      {filtersOpen ? (
      <section
        aria-label="Filters"
        className="animate-rise mt-6 rounded-xl border border-line bg-paper p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">University</label>
            <select
              value={universityId}
              onChange={(e) => {
                setUniversityId(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
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
            <label className="mb-1.5 block text-xs font-medium text-muted">Programme</label>
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
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
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
            <label className="mb-1.5 block text-xs font-medium text-muted">Specialization</label>
            <select
              value={specializationId}
              onChange={(e) => {
                setSpecializationId(e.target.value);
                setSubjectId('');
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
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
            <label className="mb-1.5 block text-xs font-medium text-muted">Semester</label>
            <select
              value={semesterId}
              onChange={(e) => {
                setSemesterId(e.target.value);
                setSubjectId('');
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
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
            <label className="mb-1.5 block text-xs font-medium text-muted">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
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
            <label className="mb-1.5 block text-xs font-medium text-muted">Type</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
            >
              <option value="">
                {onlyQuestionPapers ? 'All Question Paper Types' : 'All Resource Categories'}
              </option>
              {visibleCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Regulation</label>
            <select
              value={regulationId}
              onChange={(e) => {
                setRegulationId(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
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
            <label className="mb-1.5 block text-xs font-medium text-muted">Sort</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
            >
              <option value="latest">Newest first</option>
              <option value="popular">Most downloaded</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>
      </section>
      ) : null}

      {/* Results */}
      {loading ? (
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-44 animate-pulse rounded-xl bg-neutral-soft"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="mt-4"
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
        <div className="mt-8 space-y-6">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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
