import Link from 'next/link';
import { ArrowRight, BookOpen, FileQuestion, GraduationCap } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { audienceSubjectIds } from '@/lib/subject-siblings';
import { SemesterSwitcher } from '@/components/student/SemesterSwitcher';
import { ResourceCard } from '@/components/student/ResourceCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Resource, Semester, Subject } from '@/types/database';

const RESOURCE_JOIN = `
  *,
  programme:programmes(id, code, name),
  specialization:specializations(id, code, name),
  semester:semesters(id, semester_number, label),
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name, slug, is_question_paper),
  university:universities(id, short_name, name),
  regulation:academic_regulations(id, code, name)
`;

export const metadata = {
  title: 'My Semester',
};

export default async function MySemesterPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  if (!profile.programme_id || !profile.semester_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">My Semester</h1>
        <EmptyState
          icon={GraduationCap}
          title="Pick your course first"
          description="Choose your programme and semester in your profile — this page does the rest."
          action={
            <Link
              href="/dashboard/profile"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              Go to profile
            </Link>
          }
        />
      </div>
    );
  }

  let subjectsQuery = supabase
    .from('subjects')
    .select('*')
    .eq('publication_status', 'published')
    .eq('programme_id', profile.programme_id)
    .eq('semester_id', profile.semester_id)
    .order('subject_code');

  if (profile.specialization_id) {
    subjectsQuery = subjectsQuery.or(
      `specialization_id.is.null,specialization_id.eq.${profile.specialization_id}`
    );
  }

  // Scheme-safe: a student on the 2024 scheme must never see 2019-scheme
  // subjects (or another university's list) mixed into their semester.
  // Subjects with NULL regulation/university are shared and always show.
  if (profile.regulation_id) {
    subjectsQuery = subjectsQuery.or(
      `regulation_id.is.null,regulation_id.eq.${profile.regulation_id}`
    );
  }
  if (profile.university_id) {
    subjectsQuery = subjectsQuery.or(
      `university_id.is.null,university_id.eq.${profile.university_id}`
    );
  }

  // Materials audience by course group: a course shared by only some
  // branches stores materials as branch-less, so the branch tag alone
  // would show them to branches that take a different course instead.
  const { data: allSubjects } = await supabase
    .from('subjects')
    .select('id, subject_code, semester_id, regulation_id, specialization_id, university_id')
    .eq('publication_status', 'published')
    .eq('programme_id', profile.programme_id)
    .eq('semester_id', profile.semester_id);
  const feedSubjectIds = profile.specialization_id
    ? audienceSubjectIds(
        allSubjects || [],
        new Set(
          (allSubjects || [])
            .filter(
              (s) =>
                (!s.specialization_id || s.specialization_id === profile.specialization_id) &&
                (!profile.regulation_id || !s.regulation_id || s.regulation_id === profile.regulation_id) &&
                (!profile.university_id || !s.university_id || s.university_id === profile.university_id)
            )
            .map((s) => s.id as string)
        )
      )
    : [];

  let resourcesQuery = supabase
    .from('resources')
    .select(RESOURCE_JOIN)
    .eq('publication_status', 'published')
    .eq('programme_id', profile.programme_id)
    .eq('semester_id', profile.semester_id)
    .order('created_at', { ascending: false })
    .limit(12);

  if (profile.specialization_id) {
    resourcesQuery = resourcesQuery.or(
      `specialization_id.is.null,specialization_id.eq.${profile.specialization_id}`
    );
  }
  if (feedSubjectIds.length > 0) {
    resourcesQuery = resourcesQuery.in('subject_id', feedSubjectIds);
  }

  const [
    { data: semesters },
    { data: subjects },
    { data: resources },
    { data: bookmarks },
  ] = await Promise.all([
    supabase
      .from('semesters')
      .select('*')
      .eq('programme_id', profile.programme_id)
      .eq('is_active', true)
      .order('semester_number'),
    subjectsQuery,
    resourcesQuery,
    supabase.from('bookmarks').select('resource_id').eq('user_id', profile.id),
  ]);

  const bookmarkSet = new Set((bookmarks || []).map((b) => b.resource_id));
  const semSubjects = (subjects || []) as Subject[];
  const semResources = (resources || []) as unknown as Resource[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="burgundy">{profile.programme?.name}</Badge>
            {profile.specialization ? (
              <Badge variant="neutral">{profile.specialization.name}</Badge>
            ) : null}
            <Badge variant="solid">{profile.semester?.label}</Badge>
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
            {profile.semester?.label}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Switch semester anytime — your home page updates with it.
          </p>
        </div>

        <SemesterSwitcher profile={profile} semesters={(semesters || []) as Semester[]} />
      </div>

      {/* Subjects Grid */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-charcoal lg:text-lg">
          Subjects ({semSubjects.length})
        </h2>

        {semSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Subjects for this semester haven’t been added yet."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {semSubjects.map((subj) => (
              <div
                key={subj.id}
                className="flex flex-col justify-between rounded-lg border border-line bg-canvas p-5 lg:rounded-[24px] lg:p-6"
              >
                <div>
                  <span className="inline-block rounded border border-burgundy-border bg-burgundy-tint px-2 py-0.5 font-mono text-xs font-semibold text-burgundy">
                    {subj.subject_code}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-charcoal leading-snug">
                    {subj.name}
                  </h3>
                  {subj.description ? (
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      {subj.description}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-line pt-3.5">
                  <Link
                    href={`/dashboard/materials?subjectId=${subj.id}&programmeId=${subj.programme_id}&semesterId=${subj.semester_id}`}
                    className="inline-flex flex-1 h-8 items-center justify-center gap-1 rounded bg-burgundy px-3 text-xs font-semibold text-canvas hover:bg-burgundy-dark lg:h-9 lg:rounded-full"
                  >
                    <span>Notes</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Link
                    href={`/dashboard/question-papers?subjectId=${subj.id}&programmeId=${subj.programme_id}&semesterId=${subj.semester_id}`}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft lg:h-9 lg:rounded-full"
                  >
                    <FileQuestion className="h-3.5 w-3.5 text-burgundy" />
                    <span>Papers</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Semester Resources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-charcoal lg:text-lg">
            Materials in {profile.semester?.label}
          </h2>
          <Link
            href={`/dashboard/materials?programmeId=${profile.programme_id}&semesterId=${profile.semester_id}`}
            className="text-xs font-semibold text-burgundy hover:underline"
          >
            See all →
          </Link>
        </div>

        {semResources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No materials yet"
            description="Nothing uploaded for this semester yet."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {semResources.map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                initialBookmarked={bookmarkSet.has(res.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
