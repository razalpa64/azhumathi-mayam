'use client';

import { useMemo, useState } from 'react';
import {
  AlarmClock,
  BookOpen,
  CalendarClock,
  Check,
  Coffee,
  Flame,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  TASK_KIND_LABEL,
  diffDateKeys,
  formatExamDate,
  generateStudyPlan,
  toDateKey,
  type PlanSubject,
  type StudyPlanInputs,
} from '@/lib/study-plan';
import { computeStreak } from '@/lib/streak';
import { EmptyState } from '@/components/ui/EmptyState';

const DAILY_OPTIONS = [60, 90, 120, 180, 240, 300];

function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

interface StudyPlannerClientProps {
  semesterSubjects: PlanSubject[];
  initialPlan: StudyPlanInputs | null;
  /** Subject details for the ids in initialPlan (may exceed this semester). */
  planSubjects: PlanSubject[];
  hasAcademicSetup: boolean;
  semesterLabel: string | null;
}

export function StudyPlannerClient({
  semesterSubjects,
  initialPlan,
  planSubjects,
  hasAcademicSetup,
  semesterLabel,
}: StudyPlannerClientProps) {
  const [plan, setPlan] = useState<StudyPlanInputs | null>(initialPlan);
  const [editing, setEditing] = useState<boolean>(!initialPlan);
  const [todayKey] = useState(() => toDateKey(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup-form state (prefilled from the existing plan when editing).
  const [examDate, setExamDate] = useState(initialPlan?.examDate || '');
  const [dailyMinutes, setDailyMinutes] = useState(initialPlan?.dailyMinutes || 120);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialPlan
      ? initialPlan.subjectIds.filter((id) => semesterSubjects.some((s) => s.id === id))
      : semesterSubjects.map((s) => s.id)
  );

  const subjectById = useMemo(() => {
    const map = new Map<string, PlanSubject>();
    for (const s of [...planSubjects, ...semesterSubjects]) map.set(s.id, s);
    return map;
  }, [planSubjects, semesterSubjects]);

  const planSubjectList = useMemo(() => {
    if (!plan) return [];
    return plan.subjectIds
      .map((id) => subjectById.get(id))
      .filter((s): s is PlanSubject => Boolean(s));
  }, [plan, subjectById]);

  const generated = useMemo(() => {
    if (!plan) return null;
    return generateStudyPlan(planSubjectList, plan.examDate, plan.dailyMinutes, todayKey);
  }, [plan, planSubjectList, todayKey]);

  const completedSet = useMemo(
    () => new Set(plan?.completedKeys || []),
    [plan]
  );

  const rawDays = plan ? diffDateKeys(todayKey, plan.examDate) : 0;

  async function persist(next: StudyPlanInputs): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/student/study-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your study plan.');
      setPlan({
        examDate: data.plan.examDate,
        dailyMinutes: data.plan.dailyMinutes,
        subjectIds: data.plan.subjectIds,
        completedKeys: data.plan.completedKeys,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your study plan.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!examDate || selectedIds.length === 0) return;
    const next: StudyPlanInputs = {
      examDate,
      dailyMinutes,
      subjectIds: selectedIds,
      // Editing keeps ticks for tasks that still exist in the new plan.
      completedKeys: plan?.completedKeys || [],
    };
    if (await persist(next)) setEditing(false);
  }

  async function handleToggle(key: string) {
    if (!plan) return;
    const nextKeys = completedSet.has(key)
      ? plan.completedKeys.filter((k) => k !== key)
      : [...plan.completedKeys, key];
    const previous = plan;
    setPlan({ ...plan, completedKeys: nextKeys }); // optimistic
    const ok = await persist({ ...plan, completedKeys: nextKeys });
    if (!ok) setPlan(previous);
  }

  async function handleDelete() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/student/study-plan', { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove the plan.');
      setPlan(null);
      setSelectedIds(semesterSubjects.map((s) => s.id));
      setExamDate('');
      setEditing(true);
    } catch {
      setError('Could not remove the plan. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (plan) {
      setExamDate(plan.examDate);
      setDailyMinutes(plan.dailyMinutes);
      setSelectedIds(
        plan.subjectIds.filter((id) => semesterSubjects.some((s) => s.id === id))
      );
    }
    setError(null);
    setEditing(true);
  }

  // ------------------------------------------------------------- setup
  if (editing) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-line bg-canvas p-6 sm:p-8 lg:rounded-[26px] space-y-7">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="h-5 w-5 text-burgundy" />
            <h2 className="text-base font-semibold text-charcoal">
              {plan ? 'Adjust your plan' : 'Set up your exam plan'}
            </h2>
          </div>

          {!hasAcademicSetup ? (
            <EmptyState
              icon={BookOpen}
              title="Set your course first"
              description="Choose your programme and semester in your profile — your plan is built from that semester's subjects."
              action={
                <a
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-2 rounded-md bg-burgundy px-4 py-2 text-sm font-semibold text-white hover:bg-burgundy-deep"
                >
                  Go to profile
                </a>
              }
            />
          ) : semesterSubjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects published yet"
              description="Your semester's subjects haven't been published yet, so there's nothing to plan around. Check back soon — or ask a teacher to publish them."
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Exam date
                  </span>
                  <input
                    type="date"
                    value={examDate}
                    min={todayKey}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="mt-2 block w-full rounded-md border border-line-strong bg-canvas px-3.5 py-2.5 text-sm text-charcoal focus:border-burgundy focus:outline-none"
                  />
                  <span className="mt-1.5 block text-xs text-muted">
                    The plan ends the day before, so you rest before the exam.
                  </span>
                </label>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Study time per day
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAILY_OPTIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDailyMinutes(mins)}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                          dailyMinutes === mins
                            ? 'bg-burgundy text-white'
                            : 'border border-line-strong bg-canvas text-charcoal hover:bg-neutral-soft'
                        }`}
                      >
                        {fmtMinutes(mins)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Subjects {semesterLabel ? `· ${semesterLabel}` : ''}
                  </span>
                  <span className="flex gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      className="text-burgundy hover:underline"
                      onClick={() => setSelectedIds(semesterSubjects.map((s) => s.id))}
                    >
                      Select all
                    </button>
                    <span className="text-line-strong">·</span>
                    <button
                      type="button"
                      className="text-burgundy hover:underline"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear
                    </button>
                  </span>
                </div>
                <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                  {semesterSubjects.map((s) => {
                    const checked = selectedIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-neutral-soft/60">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, s.id]
                                  : prev.filter((id) => id !== s.id)
                              )
                            }
                            className="h-4 w-4 shrink-0 accent-[#790000]"
                          />
                          <span className="rounded bg-burgundy-tint px-1.5 py-0.5 font-mono text-[11px] font-bold text-burgundy">
                            {s.code}
                          </span>
                          <span className="text-sm text-charcoal">{s.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  {selectedIds.length} of {semesterSubjects.length} subjects in the plan.
                </p>
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !examDate || selectedIds.length === 0}
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-md bg-burgundy px-5 py-2.5 text-sm font-semibold text-white hover:bg-burgundy-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {plan ? 'Save changes' : 'Generate my plan'}
                </button>
                {plan ? (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-line-strong bg-canvas px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-neutral-soft"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {plan ? (
          <div className="rounded-xl border border-line bg-neutral-soft/65 p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Removing the plan deletes your exam date and all ticks. You can
              generate a fresh one any time.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-canvas px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove plan
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // -------------------------------------------------------------- view
  if (!plan || !generated) return null;

  const streak = computeStreak(plan.completedKeys);
  const doneCount = generated.days.reduce(
    (sum, day) => sum + day.tasks.filter((t) => completedSet.has(t.key)).length,
    0
  );
  const progressPct =
    generated.totalTasks > 0 ? Math.round((doneCount / generated.totalTasks) * 100) : 0;
  const todayTasks = generated.days[0]?.tasks || [];
  const todayRemaining = todayTasks.filter((t) => !completedSet.has(t.key)).length;

  return (
    <div className="space-y-6">
      {/* Countdown header */}
      <section className="rounded-xl border border-burgundy-border bg-burgundy-tint/45 p-6 lg:rounded-[28px] lg:p-8">
        {rawDays < 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-charcoal">
              That exam date has passed
            </h2>
            <p className="text-sm text-muted">
              Your exam was on {formatExamDate(plan.examDate)}. Set a new date
              whenever your next exam is announced.
            </p>
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-2 rounded-md bg-burgundy px-4 py-2.5 text-sm font-semibold text-white hover:bg-burgundy-deep"
            >
              <CalendarClock className="h-4 w-4" /> Plan the next exam
            </button>
          </div>
        ) : rawDays === 0 ? (
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-burgundy">
              <Flame className="h-4 w-4" /> Exam day
            </p>
            <h2 className="text-2xl font-bold text-charcoal">
              Your exam is today — all the best!
            </h2>
            <p className="text-sm text-muted">
              {formatExamDate(plan.examDate)}. You prepared for this — trust
              your revision, reach early, and carry a pen that works.
            </p>
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-canvas px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-neutral-soft"
            >
              <Pencil className="h-4 w-4" /> Plan the next exam
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-burgundy">
                <AlarmClock className="h-4 w-4" /> Exam countdown
              </p>
              <p className="mt-2 text-charcoal">
                <span className="text-6xl font-extrabold leading-none lg:text-7xl">
                  {generated.daysLeft}
                </span>
                <span className="ml-2 text-lg font-semibold text-muted">
                  {generated.daysLeft === 1 ? 'day to go' : 'days to go'}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted">
                Exam on <span className="font-semibold text-charcoal">{formatExamDate(plan.examDate)}</span>
                {' · '}
                {fmtMinutes(plan.dailyMinutes)} a day
                {' · '}
                {todayRemaining > 0
                  ? `${todayRemaining} task${todayRemaining === 1 ? '' : 's'} left today`
                  : 'today’s plan complete'}
              </p>
            </div>
            <div className="min-w-[220px] flex-1 sm:max-w-xs space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-charcoal">
                    {doneCount} of {generated.totalTasks} tasks done
                  </span>
                  <span className="text-burgundy">{progressPct}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/70 ring-1 ring-burgundy-border">
                  <div
                    className="h-full rounded-full bg-burgundy transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {planSubjectList.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-white/70 px-2 py-1 font-mono text-[11px] font-bold text-burgundy ring-1 ring-burgundy-border"
                    title={s.name}
                  >
                    {s.code} ×{generated.sessionsBySubject[s.id] || 0}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit plan
              </button>
            </div>
          </div>
        )}
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      {/* Study streak — the daily-return hook */}
      {streak.totalStudyDays > 0 ? (
        <section
          aria-label="Your study streak"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-canvas px-5 py-4 lg:rounded-[28px]"
        >
          <p className="inline-flex items-center gap-2 text-sm font-bold text-charcoal">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy text-white">
              <Flame className="h-4 w-4" />
            </span>
            {streak.currentStreak > 0
              ? `${streak.currentStreak}-day streak`
              : 'Streak paused — light it again today'}
          </p>
          <p className="text-xs text-muted">
            Best {streak.longestStreak} · {streak.totalStudyDays} study days
            {streak.studiedToday
              ? ' · today done ✓'
              : streak.currentStreak > 0
                ? ' · one task today keeps it alive'
                : ''}
          </p>
          <span className="ml-auto flex items-center gap-1" aria-hidden="true">
            {streak.lastSevenDays.map((day) => (
              <span
                key={day.key}
                className={`h-2.5 w-2.5 rounded-full ${day.studied ? 'bg-burgundy' : 'bg-neutral-soft ring-1 ring-line'}`}
              />
            ))}
          </span>
        </section>
      ) : null}

      {/* Day-by-day plan */}
      {rawDays > 0 ? (
        <section className="space-y-3">
          {generated.days.slice(0, 14).map((day) => (
            <DayCard
              key={day.date}
              day={day}
              completedSet={completedSet}
              onToggle={handleToggle}
              saving={saving}
            />
          ))}
          {generated.days.length > 14 ? (
            <details className="group rounded-xl border border-line bg-canvas">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-burgundy">
                Show the remaining {generated.days.length - 14} days…
              </summary>
              <div className="space-y-3 px-3 pb-3">
                {generated.days.slice(14).map((day) => (
                  <DayCard
                    key={day.date}
                    day={day}
                    completedSet={completedSet}
                    onToggle={handleToggle}
                    saving={saving}
                  />
                ))}
              </div>
            </details>
          ) : null}
          <p className="text-xs text-muted leading-relaxed">
            Tick tasks off as you finish them. Every 7th day is a light day on
            purpose — rest is part of revision. The last days switch to
            previous-year questions and mock practice, with a gentle final day
            before the exam.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function DayCard({
  day,
  completedSet,
  onToggle,
  saving,
}: {
  day: ReturnType<typeof generateStudyPlan>['days'][number];
  completedSet: Set<string>;
  onToggle: (key: string) => void;
  saving: boolean;
}) {
  const done = day.tasks.filter((t) => completedSet.has(t.key)).length;
  return (
    <article
      className={`rounded-xl border bg-canvas p-5 ${
        day.isToday ? 'border-burgundy-border ring-1 ring-burgundy-border' : 'border-line'
      }`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-charcoal">{day.label}</h3>
        {day.isToday ? (
          <span className="rounded-full bg-burgundy px-2 py-0.5 text-[11px] font-bold text-white">
            Today
          </span>
        ) : null}
        {day.light ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-muted">
            <Coffee className="h-3 w-3" /> Light day
          </span>
        ) : null}
        <span className="ml-auto text-xs font-medium text-muted">
          ≈ {fmtMinutes(day.totalMinutes)} · {done}/{day.tasks.length} done
        </span>
      </header>
      <ul className="mt-3 divide-y divide-line">
        {day.tasks.map((task) => {
          const isDone = completedSet.has(task.key);
          return (
            <li key={task.key}>
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={isDone}
                  disabled={saving}
                  onChange={() => onToggle(task.key)}
                  className="h-4 w-4 shrink-0 accent-[#790000]"
                />
                <span className="rounded bg-burgundy-tint px-1.5 py-0.5 font-mono text-[11px] font-bold text-burgundy">
                  {task.code}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    isDone ? 'text-muted line-through' : 'text-charcoal'
                  }`}
                >
                  {task.name}
                </span>
                <span className="hidden text-xs text-muted sm:inline">
                  {TASK_KIND_LABEL[task.kind]}
                </span>
                <span className="text-xs font-medium text-muted">
                  {task.minutes}m
                </span>
                {isDone ? <Check className="h-4 w-4 text-burgundy" /> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
