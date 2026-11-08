'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function keyOf(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Overview calendar: current month at a glance. Today wears a filled
 * burgundy disc; days that received uploads carry a dot. Chevrons walk
 * through the months that have data (the last six).
 */
export function MiniCalendar({
  uploadDaysByMonth,
}: {
  /** 'yyyy-mm' → day-of-month numbers that received uploads. */
  uploadDaysByMonth: Record<string, number[]>;
}) {
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  const monthsWithRange = useMemo(() => {
    const keys: { year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return keys;
  }, [now]);

  const index = monthsWithRange.findIndex(
    (m) => m.year === cursor.year && m.month === cursor.month
  );
  const canPrev = index > 0;
  const canNext = index >= 0 && index < monthsWithRange.length - 1;

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // Monday-first offset (JS getDay: Sunday = 0)
  const offset = (first.getDay() + 6) % 7;
  const uploadDays = new Set(uploadDaysByMonth[keyOf(cursor.year, cursor.month)] || []);
  const isCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && setCursor(monthsWithRange[index - 1])}
          aria-label="Previous month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-burgundy-tint text-burgundy transition-all hover:bg-burgundy hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-burgundy-tint disabled:hover:text-burgundy cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-charcoal">
          {first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && setCursor(monthsWithRange[index + 1])}
          aria-label="Next month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-charcoal transition-all hover:bg-burgundy hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-neutral-soft disabled:hover:text-charcoal cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="rounded-md bg-neutral-soft/80 py-1 text-[10px] font-semibold text-muted"
          >
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const isToday = isCurrentMonth && day === now.getDate();
          const hasUploads = uploadDays.has(day);
          return (
            <span
              key={day}
              className="flex flex-col items-center justify-center py-0.5"
              title={hasUploads ? 'Uploads added this day' : undefined}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors',
                  isToday
                    ? 'bg-burgundy font-bold text-white shadow-[0_6px_14px_-6px_rgba(121,0,0,0.8)]'
                    : hasUploads
                      ? 'font-semibold text-burgundy'
                      : 'text-charcoal/75'
                )}
              >
                {day}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 h-1 w-1 rounded-full',
                  hasUploads && !isToday ? 'bg-burgundy' : 'bg-transparent'
                )}
              />
            </span>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
        Days with new uploads
        <span className="ml-2 inline-flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-burgundy text-[9px] font-bold text-white">
            {now.getDate()}
          </span>
          Today
        </span>
      </p>
    </div>
  );
}
