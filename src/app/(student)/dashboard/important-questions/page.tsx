import Link from 'next/link';
import { Flame } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ShareMenu } from '@/components/student/ShareMenu';
import { cn } from '@/lib/utils';
import type { ImportantQuestion } from '@/types/database';

export const metadata = {
  title: 'Important Questions',
};

export default async function ImportantQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const profile = await requireStudentAppUser();
  const { subjectId: requestedSubjectId } = await searchParams;
  const supabase = await createSupabaseServerClient();

  // The student's own semester subjects (scoped like everywhere else).
  let subjects: { id: string; subject_code: string; name: string }[] = [];
  if (profile.programme_id && profile.semester_id) {
    let query = supabase
      .from('subjects')
      .select('id, subject_code, name')
      .eq('publication_status', 'published')
      .eq('programme_id', profile.programme_id)
      .eq('semester_id', profile.semester_id)
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

  // Questions for all of those subjects (table may not exist yet →
  // empty, never an error page).
  let questions: ImportantQuestion[] = [];
  if (subjects.length > 0) {
    const { data } = await supabase
      .from('important_questions')
      .select('*')
      .in('subject_id', subjects.map((s) => s.id))
      .order('times_asked', { ascending: false })
      .limit(500);
    questions = (data || []) as unknown as ImportantQuestion[];
  }

  const countBySubject = new Map<string, number>();
  for (const q of questions) {
    countBySubject.set(q.subject_id, (countBySubject.get(q.subject_id) || 0) + 1);
  }
  const subjectsWithQuestions = subjects.filter((s) => countBySubject.has(s.id));

  const activeSubject =
    subjectsWithQuestions.find((s) => s.id === requestedSubjectId) ||
    subjectsWithQuestions[0] ||
    null;
  const activeQuestions = activeSubject
    ? questions.filter((q) => q.subject_id === activeSubject.id)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
          Important questions
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          The questions that keep coming back in your university exams,
          ranked by how often they repeat. Revise these first.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-line bg-canvas px-6 py-12 text-center">
          <p className="text-sm font-semibold text-charcoal">Set up your course first</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
            Once your programme and semester are set in your profile, your
            subjects&apos; important questions appear here.
          </p>
        </div>
      ) : subjectsWithQuestions.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-line bg-canvas px-6 py-12 text-center">
          <Flame className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm font-semibold text-charcoal">
            Nothing here yet — and that&apos;s an opportunity
          </p>
          <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-muted">
            Repeated questions for your subjects haven&apos;t been added yet.
            Meanwhile, the previous question papers for your subjects are in{' '}
            <Link href="/dashboard/question-papers" className="font-semibold text-burgundy hover:underline">
              Question Papers
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {/* Subject chips */}
          <div className="flex flex-wrap gap-2">
            {subjectsWithQuestions.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/important-questions?subjectId=${s.id}`}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                  activeSubject?.id === s.id
                    ? 'bg-burgundy text-white'
                    : 'border border-line bg-canvas text-muted hover:border-burgundy-border hover:text-burgundy'
                )}
              >
                <span className="font-mono">{s.subject_code}</span>
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                    activeSubject?.id === s.id
                      ? 'bg-white text-burgundy'
                      : 'bg-burgundy-tint text-burgundy'
                  )}
                >
                  {countBySubject.get(s.id)}
                </span>
              </Link>
            ))}
          </div>

          {activeSubject ? (
            <section className="rounded-[24px] bg-white p-6 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-charcoal">
                    <span className="font-mono text-burgundy">{activeSubject.subject_code}</span>{' '}
                    — {activeSubject.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {activeQuestions.length} repeated{' '}
                    {activeQuestions.length === 1 ? 'question' : 'questions'} · most
                    repeated first
                  </p>
                </div>
                <ShareMenu
                  size="md"
                  kind="subject"
                  path={`/dashboard/important-questions?subjectId=${activeSubject.id}`}
                  title={`${activeSubject.subject_code} — ${activeSubject.name}`}
                />
              </div>

              <ol className="mt-5 space-y-2.5">
                {activeQuestions.map((q, i) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3.5 ring-1 ring-line"
                  >
                    <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-sm font-bold text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-relaxed text-charcoal">
                        {q.question}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        {q.module ? <span>{q.module}</span> : null}
                        {q.topic ? <span>· {q.topic}</span> : null}
                        {q.years_asked ? <span>· Asked in {q.years_asked}</span> : null}
                      </p>
                    </div>
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full bg-burgundy px-2.5 py-1 text-[11px] font-bold text-white"
                      title={`Appeared ${q.times_asked} times`}
                    >
                      <Flame className="h-3 w-3" />×{q.times_asked}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 text-xs leading-relaxed text-muted">
                Practise these with the{' '}
                <Link
                  href={`/dashboard/question-papers?subjectId=${activeSubject.id}`}
                  className="font-semibold text-burgundy hover:underline"
                >
                  previous question papers
                </Link>{' '}
                for {activeSubject.subject_code} — and share this list with your
                class group before the exam.
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
