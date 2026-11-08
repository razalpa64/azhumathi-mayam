import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { StudyPlannerClient } from '@/components/student/StudyPlannerClient';
import type { PlanSubject } from '@/lib/study-plan';

export const metadata = {
  title: 'Study Planner',
};

export default async function StudyPlannerPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const hasAcademicSetup = Boolean(profile.programme_id && profile.semester_id);

  // This semester's subjects, scoped exactly like the dashboard list:
  // shared (NULL) or own branch / scheme / university.
  let semesterSubjects: PlanSubject[] = [];
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
      query = query.or(
        `regulation_id.is.null,regulation_id.eq.${profile.regulation_id}`
      );
    }
    if (profile.university_id) {
      query = query.or(
        `university_id.is.null,university_id.eq.${profile.university_id}`
      );
    }
    const { data } = await query;
    semesterSubjects = (data || []).map((s) => ({
      id: s.id as string,
      code: s.subject_code as string,
      name: s.name as string,
    }));
  }

  // Existing plan inputs (table may not exist yet → treated as none).
  const { data: planRow } = await supabase
    .from('study_plans')
    .select('exam_date, daily_minutes, subject_ids, completed_keys')
    .eq('user_id', profile.id)
    .maybeSingle();

  let planSubjects: PlanSubject[] = [];
  if (planRow && (planRow.subject_ids || []).length > 0) {
    const { data } = await supabase
      .from('subjects')
      .select('id, subject_code, name')
      .in('id', planRow.subject_ids as string[]);
    planSubjects = (data || []).map((s) => ({
      id: s.id as string,
      code: s.subject_code as string,
      name: s.name as string,
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
          Study Planner
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pick your exam day — get a day-by-day revision plan that ends the
          day before it.
        </p>
      </div>

      <StudyPlannerClient
        semesterSubjects={semesterSubjects}
        initialPlan={
          planRow
            ? {
                examDate: planRow.exam_date as string,
                dailyMinutes: planRow.daily_minutes as number,
                subjectIds: (planRow.subject_ids || []) as string[],
                completedKeys: (planRow.completed_keys || []) as string[],
              }
            : null
        }
        planSubjects={planSubjects}
        hasAcademicSetup={hasAcademicSetup}
        semesterLabel={
          profile.semester
            ? `${profile.semester.label} subjects`
            : null
        }
      />
    </div>
  );
}
