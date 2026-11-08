import { Trophy } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ContributeClient } from '@/components/student/ContributeClient';
import { getInitials } from '@/lib/utils';
import type { MaterialSubmission } from '@/types/database';

export const metadata = {
  title: 'Contribute Notes',
};

export interface LeaderboardEntry {
  studentId: string;
  name: string;
  username: string;
  approved: number;
}

export default async function ContributePage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const hasAcademicSetup = Boolean(profile.programme_id && profile.semester_id);

  // Subjects the student can contribute to: their own semester subjects
  // (scoped like everywhere else) — keeps contributions relevant.
  let subjects: { id: string; subject_code: string; name: string }[] = [];
  if (hasAcademicSetup) {
    let query = supabase
      .from('subjects')
      .select('id, subject_code, name')
      .eq('publication_status', 'published')
      .eq('programme_id', profile.programme_id as string)
      .eq('semester_id', profile.semester_id as string)
      .order('subject_code');
    if (profile.specialization_id) {
      query = query.or(
        `specialization_id.is.null,specialization_id.eq.${profile.specialization_id}`
      );
    }
    if (profile.regulation_id) {
      query = query.or(`regulation_id.is.null,regulation_id.eq.${profile.regulation_id}`);
    }
    if (profile.university_id) {
      query = query.or(`university_id.is.null,university_id.eq.${profile.university_id}`);
    }
    const { data } = await query;
    subjects = data || [];
  }

  const { data: categories } = await supabase
    .from('resource_categories')
    .select('id, name')
    .order('display_order');

  // My uploads (table may not exist yet → empty, never an error page).
  const { data: mySubmissions } = await supabase
    .from('material_submissions')
    .select('*, subject:subjects(id, subject_code, name), category:resource_categories(id, name)')
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Top contributors: approved uploads per student (names + counts
  // only — this is a celebration board, not personal data).
  let leaderboard: LeaderboardEntry[] = [];
  let myApproved = 0;
  try {
    const admin = createSupabaseAdminClient();
    const { data: approved } = await admin
      .from('material_submissions')
      .select('student_id')
      .eq('status', 'approved')
      .limit(5000);
    const counts = new Map<string, number>();
    for (const row of approved || []) {
      const id = row.student_id as string;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    myApproved = counts.get(profile.id) || 0;
    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    if (top.length > 0) {
      const { data: people } = await admin
        .from('profiles')
        .select('id, full_name, username')
        .in('id', top.map(([id]) => id));
      const byId = new Map((people || []).map((p) => [p.id as string, p]));
      leaderboard = top.map(([studentId, count]) => ({
        studentId,
        name: (byId.get(studentId)?.full_name as string) || 'Student',
        username: (byId.get(studentId)?.username as string) || '',
        approved: count,
      }));
    }
  } catch {
    leaderboard = [];
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
          Contribute notes
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Have a good note, question paper or cheat sheet your juniors would
          love? Share its Google Drive link — once an admin approves it, it
          goes live for everyone and counts on the contributors board.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <ContributeClient
          subjects={subjects}
          categories={categories || []}
          initialSubmissions={(mySubmissions || []) as unknown as MaterialSubmission[]}
          hasAcademicSetup={hasAcademicSetup}
        />

        {/* Top contributors */}
        <aside className="rounded-[24px] bg-white p-6 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy-tint text-burgundy">
              <Trophy className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-charcoal">Top contributors</h2>
              <p className="text-xs text-muted">Most approved uploads</p>
            </div>
          </div>

          {leaderboard.length > 0 ? (
            <ol className="mt-5 space-y-2">
              {leaderboard.map((entry, i) => (
                <li
                  key={entry.studentId}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                    entry.studentId === profile.id
                      ? 'bg-burgundy-tint ring-1 ring-burgundy-border'
                      : 'bg-canvas ring-1 ring-line'
                  }`}
                >
                  <span className="w-6 shrink-0 text-center text-sm" aria-label={`Rank ${i + 1}`}>
                    {medals[i] || <span className="font-mono font-bold text-muted">{i + 1}</span>}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-white">
                    {getInitials(entry.name)}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-semibold text-charcoal">
                      {entry.name}
                      {entry.studentId === profile.id ? ' (you)' : ''}
                    </span>
                    <span className="block truncate text-[11px] text-muted">@{entry.username}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-burgundy px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                    {entry.approved}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 rounded-2xl bg-canvas p-4 text-[13px] leading-relaxed text-muted ring-1 ring-line">
              Nobody is on the board yet. Be the first — upload a note your
              class will thank you for.
            </p>
          )}

          <p className="mt-4 text-xs leading-relaxed text-muted">
            You have <strong className="text-charcoal">{myApproved}</strong> approved{' '}
            {myApproved === 1 ? 'upload' : 'uploads'} so far. Approved uploads
            appear in the library with your contribution credited.
          </p>
        </aside>
      </div>
    </div>
  );
}
