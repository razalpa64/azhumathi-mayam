/**
 * Study streaks, computed from a study plan's completed task keys
 * ("yyyy-mm-dd|subjectId|kind", see src/lib/study-plan.ts). A day
 * counts when at least one task was completed on it.
 *
 * Rules:
 *  - current streak = consecutive studied days ending today; if today
 *    has no completion yet, the streak is still alive and counts back
 *    from yesterday (it only breaks once a full day is missed).
 *  - longest streak = best run anywhere in the history.
 */
import { addDaysKey, diffDateKeys, toDateKey } from './study-plan';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  studiedToday: boolean;
  /** The last seven days, oldest first, ending today. */
  lastSevenDays: { key: string; studied: boolean }[];
}

export function studiedDayKeys(completedKeys: readonly string[]): Set<string> {
  const days = new Set<string>();
  for (const key of completedKeys) {
    const day = key.split('|')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days.add(day);
  }
  return days;
}

export function computeStreak(
  completedKeys: readonly string[],
  today: Date = new Date()
): StreakInfo {
  const days = studiedDayKeys(completedKeys);
  const todayKey = toDateKey(today);

  // Longest run over the sorted unique days.
  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev && diffDateKeys(prev, day) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = day;
  }

  // Current streak: anchor at today, else yesterday, then walk back.
  let anchor: string | null = null;
  if (days.has(todayKey)) anchor = todayKey;
  else {
    const yesterday = addDaysKey(todayKey, -1);
    if (days.has(yesterday)) anchor = yesterday;
  }
  let current = 0;
  if (anchor) {
    let cursor: string = anchor;
    while (days.has(cursor)) {
      current += 1;
      cursor = addDaysKey(cursor, -1);
    }
  }

  const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(todayKey, i - 6);
    return { key, studied: days.has(key) };
  });

  return {
    currentStreak: current,
    longestStreak: longest,
    totalStudyDays: days.size,
    studiedToday: days.has(todayKey),
    lastSevenDays,
  };
}
