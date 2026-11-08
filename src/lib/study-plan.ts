/**
 * Exam countdown + study planner engine.
 *
 * Pure and deterministic: the same (subjects, examDate, dailyMinutes,
 * today) always produces the same day-by-day plan, so only the plan
 * inputs are stored in the database (see study_plans) and the schedule
 * is regenerated on the fly. Completed tasks are tracked as opaque
 * keys ("yyyy-mm-dd|subjectId|kind").
 *
 * Shape of the plan:
 *  - Coverage phase  — first pass through every subject, in order.
 *  - Revision phase  — second pass, shorter sessions.
 *  - Final phase     — previous-year-question / mock practice, with a
 *                      deliberately light last day before the exam.
 * Every 7th study day is a light day (one revision session) so the
 * plan does not burn the student out. For very short windows the
 * phases collapse gracefully into a crash-revision plan.
 */

export interface PlanSubject {
  id: string;
  code: string;
  name: string;
}

export type PlanTaskKind = 'study' | 'revise' | 'practice';

export interface PlanTask {
  subjectId: string;
  code: string;
  name: string;
  kind: PlanTaskKind;
  minutes: number;
  /** Completion key: "yyyy-mm-dd|subjectId|kind". */
  key: string;
}

export interface PlanDay {
  /** yyyy-mm-dd (local). */
  date: string;
  /** e.g. "Mon 10 Nov". */
  label: string;
  isToday: boolean;
  light: boolean;
  tasks: PlanTask[];
  totalMinutes: number;
}

export interface GeneratedPlan {
  /** yyyy-mm-dd (local). */
  examDate: string;
  /** Whole days from today until the exam date (0 = exam is today). */
  daysLeft: number;
  days: PlanDay[];
  /** Task count per subject id, across the whole plan. */
  sessionsBySubject: Record<string, number>;
  totalTasks: number;
}

export interface StudyPlanInputs {
  examDate: string;
  dailyMinutes: number;
  subjectIds: string[];
  completedKeys: string[];
}

const TASK_MINUTES: Record<PlanTaskKind, number> = {
  study: 50,
  revise: 30,
  practice: 45,
};

export const TASK_KIND_LABEL: Record<PlanTaskKind, string> = {
  study: 'Learn & make notes',
  revise: 'Revise + recall',
  practice: 'PYQs & mock practice',
};

/** Local yyyy-mm-dd for a Date. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a yyyy-mm-dd key as a local date (never UTC-shifted). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** Whole days from `fromKey` to `toKey` (both yyyy-mm-dd, local). */
export function diffDateKeys(fromKey: string, toKey: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = parseDateKey(fromKey).getTime();
  const b = parseDateKey(toKey).getTime();
  return Math.round((b - a) / msPerDay);
}

export function addDaysKey(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function formatDayLabel(key: string): string {
  return parseDateKey(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatExamDate(key: string): string {
  return parseDateKey(key).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function generateStudyPlan(
  subjects: PlanSubject[],
  examDate: string,
  dailyMinutes: number,
  today: string = toDateKey(new Date())
): GeneratedPlan {
  const daysLeft = diffDateKeys(today, examDate);
  const sessionsBySubject: Record<string, number> = {};
  if (daysLeft <= 0 || subjects.length === 0) {
    return { examDate, daysLeft: Math.max(daysLeft, 0), days: [], sessionsBySubject, totalTasks: 0 };
  }

  const studyDayCount = daysLeft; // today .. day before the exam
  const perDay = Math.min(6, Math.max(1, Math.round(dailyMinutes / 45)));

  // Phase sizes (in days). Final phase always exists when there is
  // room; revision phase appears once the window is at least 4 days.
  let finalCount = 0;
  let reviseCount = 0;
  if (studyDayCount >= 10) {
    finalCount = 3;
    reviseCount = Math.max(1, Math.round((studyDayCount - finalCount) * 0.35));
  } else if (studyDayCount >= 5) {
    finalCount = 2;
    reviseCount = 1;
  } else if (studyDayCount >= 3) {
    finalCount = 1;
    reviseCount = 1;
  } else if (studyDayCount === 2) {
    finalCount = 1;
  }
  const studyCount = studyDayCount - finalCount - reviseCount;

  const days: PlanDay[] = [];
  let totalTasks = 0;
  // One continuous subject rotation shared across phases, so with few
  // days every subject is still touched before any repeats.
  let rotation = 0;
  const nextSubject = (): PlanSubject => {
    const s = subjects[rotation % subjects.length];
    rotation += 1;
    return s;
  };

  for (let i = 0; i < studyDayCount; i += 1) {
    const date = addDaysKey(today, i);
    const inFinal = i >= studyDayCount - finalCount;
    const inRevise = !inFinal && i >= studyCount;
    const isLastStudyDay = i === studyDayCount - 1;
    // Light day: every 7th study day, never inside the final phase.
    const light = !inFinal && studyDayCount >= 7 && i % 7 === 6;

    let sessions: number;
    let kind: PlanTaskKind;
    if (inFinal) {
      kind = 'practice';
      sessions = isLastStudyDay ? Math.max(1, Math.ceil(perDay / 2)) : perDay;
    } else if (inRevise) {
      kind = 'revise';
      sessions = perDay;
    } else {
      kind = 'study';
      sessions = perDay;
    }
    if (light) {
      kind = 'revise';
      sessions = 1;
    }

    const tasks: PlanTask[] = [];
    for (let t = 0; t < sessions; t += 1) {
      const s = nextSubject();
      const key = `${date}|${s.id}|${kind}`;
      tasks.push({
        subjectId: s.id,
        code: s.code,
        name: s.name,
        kind,
        minutes: TASK_MINUTES[kind],
        key,
      });
      sessionsBySubject[s.id] = (sessionsBySubject[s.id] || 0) + 1;
      totalTasks += 1;
    }

    days.push({
      date,
      label: formatDayLabel(date),
      isToday: i === 0,
      light,
      tasks,
      totalMinutes: tasks.reduce((sum, t) => sum + t.minutes, 0),
    });
  }

  return { examDate, daysLeft, days, sessionsBySubject, totalTasks };
}
