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

function blankSemesters(n: number): SemesterRow[] {
  return Array.from({ length: n }, () => ({ id: nextId(), sgpa: '', credits: '' }));
}

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] font-semibold text-charcoal outline-none transition-all placeholder:text-sm placeholder:font-normal placeholder:text-muted/60 focus:border-burgundy focus:ring-4 focus:ring-burgundy/10';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
      {children}
    </span>
  );
}

export function SgpaCalculatorClient() {
  const [mode, setMode] = useState<'sgpa' | 'cgpa'>('sgpa');
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => blankSubjects(6));
  const [semesters, setSemesters] = useState<SemesterRow[]>(() => blankSemesters(4));

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
  const totalRows = mode === 'sgpa' ? subjects.length : semesters.length;

  function reset() {
    if (mode === 'sgpa') setSubjects(blankSubjects(6));
    else setSemesters(blankSemesters(4));
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
      <div className="p-4 sm:p-6">
        {/* Mode switch */}
        <div
          className="grid grid-cols-2 gap-1 rounded-full bg-neutral-soft p-1"
          role="tablist"
          aria-label="Calculator mode"
        >
          {(
            [
              ['sgpa', 'SGPA · one semester'],
              ['cgpa', 'CGPA · all semesters'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'rounded-full px-3 py-2.5 text-[13px] font-bold transition-all cursor-pointer sm:text-sm',
                mode === value
                  ? 'bg-burgundy text-white shadow-[0_8px_16px_-8px_rgba(121,0,0,0.7)]'
                  : 'text-muted hover:text-burgundy'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Entry rows */}
        {mode === 'sgpa' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {subjects.map((row, i) => (
              <div key={row.id} className="rounded-2xl border border-line bg-canvas p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal">Subject {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSubjects((rows) => rows.filter((r) => r.id !== row.id))}
                    disabled={subjects.length <= 1}
                    aria-label={`Remove subject ${i + 1}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-[1fr_1.2fr] gap-2">
                  <label className="block">
                    <FieldLabel>Credits</FieldLabel>
                    <input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      placeholder="4"
                      aria-label={`Subject ${i + 1} credits`}
                      value={row.credits}
                      onChange={(e) =>
                        setSubjects((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, credits: e.target.value } : r))
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Grade</FieldLabel>
                    <select
                      aria-label={`Subject ${i + 1} grade`}
                      value={row.grade}
                      onChange={(e) =>
                        setSubjects((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, grade: e.target.value } : r))
                        )
                      }
                      className={cn(inputClass, !row.grade && 'font-normal text-muted')}
                    >
                      <option value="">Select grade</option>
                      {KTU_GRADES.map((g) => (
                        <option key={g.label} value={g.points}>
                          {g.label} · {g.points} pts
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {semesters.map((row, i) => (
              <div key={row.id} className="rounded-2xl border border-line bg-canvas p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal">Semester {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSemesters((rows) => rows.filter((r) => r.id !== row.id))}
                    disabled={semesters.length <= 1}
                    aria-label={`Remove semester ${i + 1}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <label className="block">
                    <FieldLabel>SGPA</FieldLabel>
                    <input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      placeholder="8.25"
                      aria-label={`Semester ${i + 1} SGPA`}
                      value={row.sgpa}
                      onChange={(e) =>
                        setSemesters((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, sgpa: e.target.value } : r))
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Credits</FieldLabel>
                    <input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="40"
                      step="0.5"
                      placeholder="23"
                      aria-label={`Semester ${i + 1} credits`}
                      value={row.credits}
                      onChange={(e) =>
                        setSemesters((rows) =>
                          rows.map((r) => (r.id === row.id ? { ...r, credits: e.target.value } : r))
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Row actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              mode === 'sgpa'
                ? setSubjects((rows) => [...rows, { id: nextId(), credits: '', grade: '' }])
                : setSemesters((rows) => [...rows, { id: nextId(), sgpa: '', credits: '' }])
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-white transition-all hover:bg-burgundy-dark active:scale-95 cursor-pointer"
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
          {result && result.filled < totalRows ? (
            <span className="text-xs text-muted">
              Counting {result.filled} of {totalRows} — fill the rest for the full picture.
            </span>
          ) : null}
        </div>

        {/* Result */}
        <div className="mt-5 rounded-[20px] bg-burgundy p-5 text-white sm:p-6">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            <Calculator className="h-3.5 w-3.5" />
            Your {mode === 'sgpa' ? 'SGPA' : 'CGPA'}
          </p>
          <p className="mt-1.5 text-[52px] font-extrabold leading-none tabular-nums tracking-tight">
            {result ? result.value.toFixed(2) : '—'}
          </p>

          <div className="mt-5 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-3.5">
            {[
              ['Equivalent %', result ? `${(result.value * 10).toFixed(1)}%` : '—'],
              ['Total credits', result ? String(result.credits) : '—'],
              [
                mode === 'sgpa' ? 'Subjects' : 'Semesters',
                result ? `${result.filled}/${totalRows}` : '—',
              ],
            ].map(([label, value]) => (
              <div key={label} className="px-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                  {label}
                </p>
                <p className="mt-0.5 truncate text-base font-extrabold tabular-nums sm:text-lg">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-white/70">
            {result
              ? 'Percentage uses KTU’s current formula, CGPA × 10 (Academic Council, June 2023). Older certificates sometimes use (CGPA × 10) − 3.75.'
              : `Enter credits and ${mode === 'sgpa' ? 'a grade' : 'an SGPA'} above — your result appears here instantly.`}
          </p>
        </div>
      </div>
    </div>
  );
}
