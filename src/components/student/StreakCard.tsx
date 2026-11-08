import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreakInfo } from '@/lib/streak';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * "You're on a 6-day streak" — the daily-return hook for the study
 * planner. Renders nothing until the student has studied at least one
 * day (the planner's own cards handle the not-started state).
 */
export function StreakCard({ streak }: { streak: StreakInfo }) {
  if (streak.totalStudyDays === 0) return null;

  const todayIndex = new Date().getDay();

  return (
    <section
      aria-label="Your study streak"
      className="anim-rise flex flex-col gap-4 rounded-[24px] bg-white p-5 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06] sm:flex-row sm:items-center sm:gap-6 sm:p-6"
      style={{ animationDelay: '120ms' }}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
            streak.currentStreak > 0
              ? 'bg-burgundy text-white shadow-[0_12px_22px_-10px_rgba(121,0,0,0.7)]'
              : 'bg-neutral-soft text-muted'
          )}
        >
          <Flame className="h-7 w-7" />
          {streak.currentStreak > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E5484D] px-1 text-[11px] font-bold text-white ring-2 ring-white">
              {streak.currentStreak}
            </span>
          ) : null}
        </span>
        <div>
          <p className="text-lg font-extrabold leading-tight text-charcoal">
            {streak.currentStreak > 0
              ? `${streak.currentStreak}-day study streak`
              : 'Streak paused — restart it today'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {streak.studiedToday
              ? 'Today is in the bag. Keep it alive tomorrow.'
              : streak.currentStreak > 0
                ? 'Finish one planner task today to keep the streak alive.'
                : 'Tick any study-planner task and the flame is lit again.'}{' '}
            Best: {streak.longestStreak} · Total study days: {streak.totalStudyDays}
          </p>
        </div>
      </div>

      {/* Last seven days */}
      <div className="flex items-center gap-1.5 sm:ml-auto" aria-hidden="true">
        {streak.lastSevenDays.map((day, i) => {
          const dayIndex = (todayIndex - (6 - i) + 7) % 7;
          const isToday = i === 6;
          return (
            <span key={day.key} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold',
                  day.studied
                    ? 'bg-burgundy text-white'
                    : isToday
                      ? 'bg-burgundy-tint text-burgundy ring-1 ring-burgundy-border'
                      : 'bg-neutral-soft text-muted/60'
                )}
              >
                {day.studied ? <Flame className="h-3.5 w-3.5" /> : DAY_LETTERS[dayIndex]}
              </span>
              <span className={cn('text-[9px] font-semibold', isToday ? 'text-burgundy' : 'text-muted/70')}>
                {isToday ? 'Today' : DAY_LETTERS[dayIndex]}
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
