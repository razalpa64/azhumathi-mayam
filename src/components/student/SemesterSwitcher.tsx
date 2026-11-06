'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Profile, Semester } from '@/types/database';

interface SemesterSwitcherProps {
  profile: Profile;
  semesters: Semester[];
}

export function SemesterSwitcher({ profile, semesters }: SemesterSwitcherProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function handleChange(nextSemesterId: string) {
    if (!nextSemesterId || nextSemesterId === profile.semester_id) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          full_name: profile.full_name,
          university_id: profile.university_id,
          programme_id: profile.programme_id,
          specialization_id: profile.specialization_id,
          regulation_id: profile.regulation_id,
          semester_id: nextSemesterId,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setUpdating(false);
    }
  }

  if (semesters.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="quick-sem-switch" className="text-xs font-medium text-muted">
        Active Semester:
      </label>
      <div className="relative">
        <select
          id="quick-sem-switch"
          value={profile.semester_id || ''}
          disabled={updating}
          onChange={(e) => handleChange(e.target.value)}
          className="h-9 rounded-md border border-line-strong bg-canvas pl-3 pr-8 text-xs font-semibold text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-60"
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {updating ? (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-burgundy" />
        ) : null}
      </div>
    </div>
  );
}
