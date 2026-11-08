'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronRight, Flame } from 'lucide-react';
import {
  diffDateKeys,
  formatExamDate,
  generateStudyPlan,
  toDateKey,
  type PlanSubject,
} from '@/lib/study-plan';

/**
 * Dashboard countdown strip: renders only when the student has a
 * study plan with an exam today or in the future. Fetches the plan
 * inputs and regenerates today's view client-side.
 */
export function ExamCountdownCard() {
  const [view, setView] = useState<{
    daysLeft: number;
    examDate: string;
    todayRemaining: number;
    todayTotal: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/student/study-plan');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.plan || cancelled) return;

        const today = toDateKey(new Date());
        const rawDays = diffDateKeys(today, data.plan.examDate as string);
        if (rawDays < 0) return;

        const subjects: PlanSubject[] = (data.subjects || []).map(
          (s: { id: string; subject_code: string; name: string }) => ({
            id: s.id,
            code: s.subject_code,
            name: s.name,
          })
        );
        const ordered = (data.plan.subjectIds as string[])
          .map((id) => subjects.find((s) => s.id === id))
          .filter((s): s is PlanSubject => Boolean(s));
        const generated = generateStudyPlan(
          ordered,
          data.plan.examDate,
          data.plan.dailyMinutes,
          today
        );
        const completed = new Set<string>(data.plan.completedKeys || []);
        const todayTasks = generated.days[0]?.tasks || [];
        if (!cancelled) {
          setView({
            daysLeft: rawDays,
            examDate: data.plan.examDate,
            todayRemaining: todayTasks.filter((t) => !completed.has(t.key)).length,
            todayTotal: todayTasks.length,
          });
        }
      } catch {
        // Countdown is a nicety; never break the dashboard over it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!view) return null;

  return (
    <Link
      href="/dashboard/study-planner"
      className="anim-rise group flex items-center gap-4 rounded-[20px] border border-burgundy-border bg-burgundy-tint/45 px-5 py-4 transition-all hover:border-burgundy/40 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_16px_28px_-20px_rgba(36,7,7,0.4)]"
      style={{ animationDelay: '120ms' }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-burgundy text-white">
        {view.daysLeft === 0 ? (
          <Flame className="h-5 w-5" />
        ) : (
          <CalendarClock className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {view.daysLeft === 0 ? (
          <>
            <span className="block truncate text-[15px] font-bold text-charcoal">
              Your exam is today — all the best!
            </span>
            <span className="block text-xs text-muted">
              {formatExamDate(view.examDate)}
            </span>
          </>
        ) : (
          <>
            <span className="block truncate text-[15px] font-bold text-charcoal">
              {view.daysLeft} {view.daysLeft === 1 ? 'day' : 'days'} to your exam
              <span className="ml-2 font-medium text-muted">
                {formatExamDate(view.examDate)}
              </span>
            </span>
            <span className="block text-xs text-muted">
              {view.todayTotal === 0
                ? 'Open your study plan'
                : view.todayRemaining > 0
                  ? `${view.todayRemaining} of ${view.todayTotal} tasks left today — keep going`
                  : 'Today’s plan complete. Well done!'}
            </span>
          </>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-burgundy transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
