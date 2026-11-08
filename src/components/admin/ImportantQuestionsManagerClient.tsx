'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Flame,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportantQuestion } from '@/types/database';

interface SlimSubject {
  id: string;
  subject_code: string;
  name: string;
  programme: string;
  semester: string;
}

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15';

export function ImportantQuestionsManagerClient({
  subjects,
}: {
  subjects: SlimSubject[];
}) {
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [questions, setQuestions] = useState<ImportantQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [question, setQuestion] = useState('');
  const [module, setModule] = useState('');
  const [topic, setTopic] = useState('');
  const [yearsAsked, setYearsAsked] = useState('');
  const [timesAsked, setTimesAsked] = useState('1');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects.slice(0, 30);
    return subjects
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.subject_code.toLowerCase().includes(q) ||
          s.programme.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [query, subjects]);

  const selected = subjects.find((s) => s.id === subjectId) || null;

  useEffect(() => {
    if (!subjectId) {
      setQuestions([]);
      return;
    }
    let cancelled = false;
    setLoadingQuestions(true);
    fetch(`/api/admin/important-questions?subjectId=${encodeURIComponent(subjectId)}`, {
      credentials: 'same-origin',
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setQuestions(data.items || []);
      })
      .catch(() => {
        if (!cancelled) setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!subjectId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/important-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          subject_id: subjectId,
          question,
          module: module || null,
          topic: topic || null,
          years_asked: yearsAsked || null,
          times_asked: Number(timesAsked) || 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not save that question.');
        return;
      }
      setQuestions((items) =>
        [data.item as ImportantQuestion, ...items].sort(
          (a, b) => b.times_asked - a.times_asked
        )
      );
      setQuestion('');
      setModule('');
      setTopic('');
      setYearsAsked('');
      setTimesAsked('1');
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/admin/important-questions?id=${encodeURIComponent(id)}`,
        { method: 'DELETE', credentials: 'same-origin' }
      );
      if (res.ok) setQuestions((items) => items.filter((q) => q.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      {/* Subject picker */}
      <section className="rounded-[24px] border border-line bg-canvas p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject or code…"
            className="h-11 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15"
          />
        </label>
        <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto pr-1">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSubjectId(s.id)}
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer',
                  subjectId === s.id
                    ? 'bg-burgundy text-white'
                    : 'hover:bg-neutral-soft'
                )}
              >
                <span
                  className={cn(
                    'block truncate text-[13px] font-semibold',
                    subjectId === s.id ? 'text-white' : 'text-charcoal'
                  )}
                >
                  <span className="font-mono">{s.subject_code}</span> — {s.name}
                </span>
                <span
                  className={cn(
                    'block truncate text-[11px]',
                    subjectId === s.id ? 'text-white/70' : 'text-muted'
                  )}
                >
                  {s.programme}
                  {s.semester ? ` · ${s.semester}` : ''}
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-muted">
              No subject matches that search.
            </li>
          ) : null}
        </ul>
      </section>

      {/* Questions for the selected subject */}
      <section className="rounded-[24px] border border-line bg-canvas p-5 sm:p-6">
        {selected ? (
          <>
            <h2 className="text-[15px] font-semibold text-charcoal">
              <span className="font-mono text-burgundy">{selected.subject_code}</span> —{' '}
              {selected.name}
            </h2>

            <form onSubmit={handleAdd} className="mt-5 space-y-3">
              <textarea
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type the repeated question exactly as it appears in papers…"
                maxLength={1000}
                rows={3}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15"
              />
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  placeholder="Module (e.g. Module 3)"
                  maxLength={60}
                  className={inputClass}
                />
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Topic (optional)"
                  maxLength={120}
                  className={inputClass}
                />
                <input
                  value={yearsAsked}
                  onChange={(e) => setYearsAsked(e.target.value)}
                  placeholder="Years (2023, 2025)"
                  maxLength={60}
                  className={inputClass}
                />
                <input
                  value={timesAsked}
                  onChange={(e) => setTimesAsked(e.target.value)}
                  type="number"
                  min={1}
                  max={50}
                  aria-label="Times asked"
                  title="Times asked"
                  className={inputClass}
                />
              </div>
              {error ? (
                <p role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-burgundy px-5 text-[13px] font-semibold text-white transition-all hover:bg-burgundy-dark active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add question
              </button>
            </form>

            <div className="mt-6 border-t border-line pt-4">
              {loadingQuestions ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
                </p>
              ) : questions.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  No repeated questions recorded for this subject yet. Skim the
                  last 3–4 question papers, and add anything that keeps coming
                  back.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {questions.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-start gap-3 rounded-2xl bg-neutral-soft/60 px-4 py-3 ring-1 ring-line"
                    >
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-burgundy px-2.5 py-1 text-[11px] font-bold text-white">
                        <Flame className="h-3 w-3" />×{q.times_asked}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-relaxed text-charcoal">
                          {q.question}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {[q.module, q.topic, q.years_asked ? `Asked in ${q.years_asked}` : null]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        disabled={deletingId === q.id}
                        aria-label="Delete question"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-40 cursor-pointer"
                      >
                        {deletingId === q.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
            <Flame className="h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm font-semibold text-charcoal">Pick a subject to begin</p>
            <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
              Choose a subject on the left, then add the questions that keep
              repeating in its exams.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
