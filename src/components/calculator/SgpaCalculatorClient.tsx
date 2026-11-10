'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SCALE_ID, UNIVERSITY_SCALES, getUniversityScale } from '@/lib/university-grades';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const inputClass =
  'h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-burgundy focus-visible:ring-2 focus-visible:ring-burgundy/30';

interface SubjectRow {
  name: string;
  credits: string;
  grade: string; // grade points as string, '' = not chosen
}
interface SemRow {
  sgpa: string;
  credits: string;
}

const STORAGE_KEY = 'azm-sgpa-calculator-v2';

const emptySubjects = (): SubjectRow[] =>
  Array.from({ length: 6 }, () => ({ name: '', credits: '4', grade: '' }));
const emptySems = (): SemRow[] => Array.from({ length: 2 }, () => ({ sgpa: '', credits: '22' }));

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}

function parseStored(value: unknown): { scaleId?: string; subjects?: SubjectRow[]; sems?: SemRow[] } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  return {
    scaleId: typeof v.scaleId === 'string' ? v.scaleId : undefined,
    subjects: Array.isArray(v.subjects) ? (v.subjects as SubjectRow[]) : undefined,
    sems: Array.isArray(v.sems) ? (v.sems as SemRow[]) : undefined,
  };
}

export function SgpaCalculatorClient({ ownScaleId = null }: { ownScaleId?: string | null }) {
  const [scaleId, setScaleId] = useState(ownScaleId || DEFAULT_SCALE_ID);
  // Signed-in students land on their own university; "Change" opens the full
  // list for anyone helping a friend or sitting another university's paper.
  const [showAllScales, setShowAllScales] = useState(false);
  const [mode, setMode] = useState<'subjects' | 'semesters'>('subjects');
  const [subjects, setSubjects] = useState<SubjectRow[]>(emptySubjects);
  const [sems, setSems] = useState<SemRow[]>(emptySems);
  const [hydrated, setHydrated] = useState(false);

  const scale = getUniversityScale(scaleId);

  useEffect(() => {
    try {
      const parsed = parseStored(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'));
      if (!ownScaleId && parsed?.scaleId && UNIVERSITY_SCALES.some((s) => s.id === parsed.scaleId)) {
        setScaleId(parsed.scaleId);
      }
      if (parsed?.subjects?.length) setSubjects(parsed.subjects);
      if (parsed?.sems?.length) setSems(parsed.sems);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [ownScaleId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scaleId, subjects, sems }));
    } catch {
      /* ignore */
    }
  }, [hydrated, scaleId, subjects, sems]);

  // Switching university clears chosen grades (their points mean different
  // things on another scale) but keeps credits and subject names.
  function changeUniversity(id: string) {
    if (id === scaleId) return;
    setScaleId(id);
    setSubjects((rows) => rows.map((r) => ({ ...r, grade: '' })));
  }

  const subjectResult = useMemo(() => {
    let points = 0;
    let credits = 0;
    let counted = 0;
    for (const row of subjects) {
      const c = parseFloat(row.credits);
      const g = parseFloat(row.grade);
      if (Number.isFinite(c) && c > 0 && Number.isFinite(g)) {
        points += c * g;
        credits += c;
        counted += 1;
      }
    }
    if (credits <= 0) return null;
    return { gpa: points / credits, credits, counted };
  }, [subjects]);

  const semResult = useMemo(() => {
    let points = 0;
    let credits = 0;
    let counted = 0;
    for (const row of sems) {
      const s = parseFloat(row.sgpa);
      const c = parseFloat(row.credits);
      if (Number.isFinite(s) && s >= 0 && s <= 10.0001 && Number.isFinite(c) && c > 0) {
        points += s * c;
        credits += c;
        counted += 1;
      }
    }
    if (credits <= 0) return null;
    return { gpa: points / credits, credits, counted };
  }, [sems]);

  const result = mode === 'subjects' ? subjectResult : semResult;
  const percentage = result ? Math.max(0, Math.min(100, scale.toPercentage(result.gpa))) : null;

  const updateSubject = (i: number, patch: Partial<SubjectRow>) =>
    setSubjects((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateSem = (i: number, patch: Partial<SemRow>) =>
    setSems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const resetAll = () => {
    setSubjects(emptySubjects());
    setSems(emptySems());
  };

  return (
    // Phones: one column, exactly as before. Desktop: the form on the left and
    // the answer pinned to the right, so the SGPA updates in view instead of
    // three scrolls below the fields.
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
      {/* University picker */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        {ownScaleId && !showAllScales ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900">Your university</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">
                {scale.shortName}{' '}
                <span className="font-normal text-neutral-500">— {scale.name}</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {scale.system} · from your profile
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllScales(true)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-burgundy hover:bg-burgundy-tint cursor-pointer"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <label htmlFor="calc-university" className="text-sm font-bold text-neutral-900">
              Your university
            </label>
            <select
              id="calc-university"
              value={scaleId}
              onChange={(e) => changeUniversity(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 outline-none focus:border-burgundy focus-visible:ring-2 focus-visible:ring-burgundy/30"
            >
              {UNIVERSITY_SCALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName} — {s.name}
                </option>
              ))}
            </select>
          </>
        )}
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
          {scale.system}. Grade scale and percentage formula below follow {scale.shortName}
          &rsquo;s official regulations. The points printed on your grade card always win.
        </p>
      </div>

      {/* Mode toggle */}
      <div
        role="tablist"
        aria-label="Calculator mode"
        className="flex rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm"
      >
        {(
          [
            { key: 'subjects', label: 'Subject-wise SGPA' },
            { key: 'semesters', label: 'SGPA → CGPA' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mode === tab.key}
            onClick={() => setMode(tab.key)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
              mode === tab.key
                ? 'bg-burgundy text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'subjects' ? (
        <div className="space-y-3">
          {subjects.map((row, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                  Subject {i + 1}
                </span>
                {subjects.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSubjects((rows) => rows.filter((_, idx) => idx !== i))}
                    className="text-xs font-semibold text-neutral-400 transition-colors hover:text-burgundy"
                    aria-label={`Remove subject ${i + 1}`}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-[1fr_110px]">
                <div>
                  <label htmlFor={`sub-name-${i}`} className="mb-1 block text-[11px] font-semibold text-neutral-500">
                    Subject name <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <input className={inputClass}
                    id={`sub-name-${i}`}
                    value={row.name}
                    onChange={(e) => updateSubject(i, { name: e.target.value })}
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div>
                  <label htmlFor={`sub-credits-${i}`} className="mb-1 block text-[11px] font-semibold text-neutral-500">
                    Credits
                  </label>
                  <input className={inputClass}
                    id={`sub-credits-${i}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={row.credits}
                    onChange={(e) => updateSubject(i, { credits: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-2.5">
                <label htmlFor={`sub-grade-${i}`} className="mb-1 block text-[11px] font-semibold text-neutral-500">
                  Grade you scored
                </label>
                <select
                  id={`sub-grade-${i}`}
                  value={row.grade}
                  onChange={(e) => updateSubject(i, { grade: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-burgundy focus-visible:ring-2 focus-visible:ring-burgundy/30"
                >
                  <option value="">Select grade…</option>
                  {scale.grades.map((g) => (
                    <option key={g.label} value={String(g.points)}>
                      {g.label} — {g.points} pts{g.range ? ` (${g.range}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSubjects((rows) => [...rows, { name: '', credits: '4', grade: '' }])}
          >
            + Add subject
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sems.map((row, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                  Semester {i + 1}
                </span>
                {sems.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSems((rows) => rows.filter((_, idx) => idx !== i))}
                    className="text-xs font-semibold text-neutral-400 transition-colors hover:text-burgundy"
                    aria-label={`Remove semester ${i + 1}`}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor={`sem-sgpa-${i}`} className="mb-1 block text-[11px] font-semibold text-neutral-500">
                    SGPA (0–10)
                  </label>
                  <input className={inputClass}
                    id={`sem-sgpa-${i}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10"
                    step="0.01"
                    value={row.sgpa}
                    onChange={(e) => updateSem(i, { sgpa: e.target.value })}
                    placeholder="e.g. 8.42"
                  />
                </div>
                <div>
                  <label htmlFor={`sem-credits-${i}`} className="mb-1 block text-[11px] font-semibold text-neutral-500">
                    Semester credits
                  </label>
                  <input className={inputClass}
                    id={`sem-credits-${i}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={row.credits}
                    onChange={(e) => updateSem(i, { credits: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSems((rows) => [...rows, { sgpa: '', credits: '22' }])}
          >
            + Add semester
          </Button>
          <p className="text-xs leading-relaxed text-neutral-600">
            CGPA is the credit-weighted average of your semester SGPAs — the method every
            university here uses.
          </p>
        </div>
      )}

      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
      {/* Live grade scale for the chosen university */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-neutral-900">{scale.shortName} grade points</h2>
          <Badge variant="burgundy">{scale.system}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {scale.grades.map((g) => (
            <span
              key={g.label}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700"
            >
              {g.label}
              <span className="text-burgundy">{g.points}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          Percentage formula: <strong className="text-neutral-900">{scale.formulaLabel}</strong>.{' '}
          {scale.formulaNote}
        </p>
      </div>

      {/* Result */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-burgundy px-4 py-3.5 sm:px-5">
          <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">
            {scale.shortName} · {mode === 'subjects' ? 'Your SGPA' : 'Your CGPA'}
          </p>
          <p className="mt-0.5 text-3xl font-extrabold text-white tabular-nums">
            {result ? fmt(result.gpa) : '—'}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100 text-center">
          <div className="px-2 py-3.5">
            <p className="text-base font-extrabold text-neutral-900 tabular-nums">
              {percentage !== null ? `${fmt(percentage, 1)}%` : '—'}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">
              Percentage ({scale.formulaLabel})
            </p>
          </div>
          <div className="px-2 py-3.5">
            <p className="text-base font-extrabold text-neutral-900 tabular-nums">
              {result ? result.credits : '—'}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">Total credits</p>
          </div>
          <div className="px-2 py-3.5">
            <p className="text-base font-extrabold text-neutral-900 tabular-nums">
              {result ? result.counted : '—'}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">
              {mode === 'subjects' ? 'Subjects counted' : 'Semesters counted'}
            </p>
          </div>
        </div>
        <div className="border-t border-neutral-100 px-4 py-3 sm:px-5">
          <p className="text-xs leading-relaxed text-neutral-600">
            {mode === 'subjects'
              ? `SGPA = Σ (credits × grade points) ÷ Σ credits, on the ${scale.shortName} scale (${scale.system}). `
              : `CGPA = Σ (semester credits × SGPA) ÷ Σ semester credits. `}
            {scale.formulaNote} Results are indicative — your university result portal is final.
          </p>
          <Button type="button" variant="secondary" className="mt-3" onClick={resetAll}>
            Clear everything
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
