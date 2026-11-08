'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KTU_GRADES } from '@/lib/ktu-grades';

interface SubjectRow {
  id: number;
  credits: string;
  grade: string; // points as string, '' = not chosen
}

interface SemesterRow {
  id: number;
  sgpa: string;
  credits: string;
}

const STORAGE_KEY = 'azm-sgpa-calculator-v1';

let rowId = 100;
function nextId() {
  rowId += 1;
  return rowId;
}

function blankSubjects(n: number): SubjectRow[] {
  return Array.from({ length: n }, () => ({ id: nextId(), credits: '', grade: '' }));
}

export function SgpaCalculatorClient() {
  const [mode, setMode] = useState<'sgpa' | 'cgpa'>('sgpa');
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => blankSubjects(6));
  const [semesters, setSemesters] = useState<SemesterRow[]>([
    { id: nextId(), sgpa: '', credits: '' },
    { id: nextId(), sgpa: '', credits: '' },
    { id: nextId(), sgpa: '', credits: '' },
    { id: nextId(), sgpa: '', credits: '' },
  ]);

  // Restore last session's numbers (this is a repeat-visit tool).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        mode?: 'sgpa' | 'cgpa';
        subjects?: SubjectRow[];
        semesters?: SemesterRow[];
      };
      if (saved.mode) setMode(saved.mode);
      if (Array.isArray(saved.subjects) && saved.subjects.length > 0) setSubjects(saved.subjects);
      if (Array.isArray(saved.semesters) && saved.semesters.length > 0) setSemesters(saved.semesters);
    } catch {
      // Corrupt saved state — start fresh.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, subjects, semesters }));
    } catch {
      // Storage unavailable — the calculator still works.
    }
  }, [mode, subjects, semesters]);

  const sgpaResult = useMemo(() => {
    let points = 0;
    let credits = 0;
    let filled = 0;
    for (const row of subjects) {
      const c = parseFloat(row.credits);
      const g = parseFloat(row.grade);
      if (Number.isFinite(c) && c > 0 && Number.isFinite(g)) {
        points += c * g;
        credits += c;
        filled += 1;
      }
    }
    if (credits === 0) return null;
    return { value: points / credits, credits, filled };
  }, [subjects]);

  const cgpaResult = useMemo(() => {
    let points = 0;
    let credits = 0;
    let filled = 0;
    for (const row of semesters) {
      const s = parseFloat(row.sgpa);
      const c = parseFloat(row.credits);
      if (Number.isFinite(s) && s >= 0 && s <= 10 && Number.isFinite(c) && c > 0) {
        points += s * c;
        credits += c;
        filled += 1;
      }
    }
    if (credits === 0) return null;
    return { value: points / credits, credits, filled };
  }, [semesters]);

  const result = mode === 'sgpa' ? sgpaResult : cgpaResult;

  function reset() {
    if (mode === 'sgpa') setSubjects(blankSubjects(6));
    else
      setSemesters([
        { id: nextId(), sgpa: '', credits: '' },
        { id: nextId(), sgpa: '', credits: '' },
        { id: nextId(), sgpa: '', credits: '' },
        { id: nextId(), sgpa: '', credits: '' },
      ]);
  }

  const selectClass =
    'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15';
  const inputClass =
    'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15';

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
      {/* Mode tabs */}
      <div className="flex border-b border-line" role="tablist" aria-label="Calculator mode">
        {(
          [
            ['sgpa', 'SGPA (one semester)'],
            ['cgpa', 'CGPA (all semesters)'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              'flex-1 px-4 py-3.5 text-sm font-bold transition-colors cursor-pointer',
              mode === value
                ? 'bg-burgundy text-white'
                : 'bg-canvas text-muted hover:bg-burgundy-tint hover:text-burgundy'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        {mode === 'sgpa' ? (
          <div className="space-y-2.5">
            <div className="hidden grid-cols-[1fr_110px_130px_36px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid">
              <span>Subject (optional name)</span>
              <span>Credits</span>
              <span>Grade</span>
              <span />
            </div>
            {subjects.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1fr_84px_108px_36px] items-center gap-2 sm:grid-cols-[1fr_110px_130px_36px]">
                <span className="truncate text-sm font-medium text-muted">Subject {i + 1}</span>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  placeholder="e.g. 4"
                  aria-label={`Subject ${i + 1} credits`}
                  value={row.credits}
                  onChange={(e) =>
                    setSubjects((rows) => rows.map((r) => (r.id === row.id ? { ...r, credits: e.target.value } : r)))
                  }
                  className={inputClass}
                />
                <select
                  aria-label={`Subject ${i + 1} grade`}
                  value={row.grade}
                  onChange={(e) =>
                    setSubjects((rows) => rows.map((r) => (r.id === row.id ? { ...r, grade: e.target.value } : r)))
                  }
                  className={selectClass}
                >
                  <option value="">Grade…</option>
                  {KTU_GRADES.map((g) => (
                    <option key={g.label} value={g.points}>
                      {g.label} ({g.points})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSubjects((rows) => rows.filter((r) => r.id !== row.id))}
                  disabled={subjects.length <= 1}
                  aria-label={`Remove subject ${i + 1}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="hidden grid-cols-[1fr_130px_130px_36px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid">
              <span>Semester</span>
              <span>SGPA</span>
              <span>Credits</span>
              <span />
            </div>
            {semesters.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1fr_100px_100px_36px] items-center gap-2 sm:grid-cols-[1fr_130px_130px_36px]">
                <span className="truncate text-sm font-medium text-muted">Semester {i + 1}</span>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  placeholder="e.g. 8.25"
                  aria-label={`Semester ${i + 1} SGPA`}
                  value={row.sgpa}
                  onChange={(e) =>
                    setSemesters((rows) => rows.map((r) => (r.id === row.id ? { ...r, sgpa: e.target.value } : r)))
                  }
                  className={inputClass}
                />
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  placeholder="e.g. 23"
                  aria-label={`Semester ${i + 1} credits`}
                  value={row.credits}
                  onChange={(e) =>
                    setSemesters((rows) => rows.map((r) => (r.id === row.id ? { ...r, credits: e.target.value } : r)))
                  }
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setSemesters((rows) => rows.filter((r) => r.id !== row.id))}
                  disabled={semesters.length <= 1}
                  aria-label={`Remove semester ${i + 1}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              mode === 'sgpa'
                ? setSubjects((rows) => [...rows, { id: nextId(), credits: '', grade: '' }])
                : setSemesters((rows) => [...rows, { id: nextId(), sgpa: '', credits: '' }])
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-4 text-[13px] font-semibold text-charcoal transition-colors hover:bg-neutral-soft cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add {mode === 'sgpa' ? 'subject' : 'semester'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-muted transition-colors hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Start over
          </button>
        </div>

        {/* Result */}
        <div className="mt-6 rounded-2xl bg-burgundy p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                <Calculator className="h-3.5 w-3.5" />
                Your {mode === 'sgpa' ? 'SGPA' : 'CGPA'}
              </p>
              <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight">
                {result ? result.value.toFixed(2) : '—'}
              </p>
            </div>
            <dl className="space-y-1 text-right text-sm">
              <div className="flex justify-end gap-6">
                <dt className="text-white/70">Equivalent %</dt>
                <dd className="font-bold tabular-nums">
                  {result ? `${(result.value * 10).toFixed(1)}%` : '—'}
                </dd>
              </div>
              <div className="flex justify-end gap-6">
                <dt className="text-white/70">Total credits</dt>
                <dd className="font-bold tabular-nums">{result ? result.credits : '—'}</dd>
              </div>
              <div className="flex justify-end gap-6">
                <dt className="text-white/70">{mode === 'sgpa' ? 'Subjects counted' : 'Semesters counted'}</dt>
                <dd className="font-bold tabular-nums">{result ? result.filled : '—'}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/70">
            Percentage uses KTU&apos;s current formula, CGPA × 10 (Academic Council, June
            2023). Older certificates sometimes use (CGPA × 10) − 3.75 — check which one
            your employer or university asks for.
          </p>
        </div>
      </div>
    </div>
  );
}
