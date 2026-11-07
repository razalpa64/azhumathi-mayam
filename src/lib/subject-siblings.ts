import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A course can be stored as several subject rows — one per branch that
 * takes it (e.g. GAMAT301 exists once for each of the five computing
 * branches, so each branch's syllabus list is exact). Students think in
 * courses, not rows: a note uploaded against ANY copy of a course
 * belongs to that course.
 *
 * Given any one copy's id, return the ids of every copy of the same
 * course — same programme, same semester, same course code, same
 * scheme (regulation). Materials lookups use this so an upload attached
 * to a sibling branch's copy still shows up for every branch, and
 * subject cards count it too.
 */
export async function getSubjectGroupIds(
  supabase: SupabaseClient,
  subjectId: string
): Promise<string[]> {
  const { data: seed } = await supabase
    .from('subjects')
    .select('id, subject_code, programme_id, semester_id, regulation_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!seed) return [subjectId];

  let query = supabase
    .from('subjects')
    .select('id')
    .eq('programme_id', seed.programme_id)
    .eq('semester_id', seed.semester_id)
    .eq('subject_code', seed.subject_code);
  if (seed.regulation_id) {
    query = query.eq('regulation_id', seed.regulation_id);
  }

  const { data: siblings } = await query;
  const ids = (siblings || []).map((s) => s.id as string);
  return ids.length > 0 ? ids : [subjectId];
}

/** Stable key identifying a course (not a row) within a scheme. */
export function subjectGroupKey(subjectCode: string, regulationId: string | null): string {
  return `${subjectCode}|${regulationId ?? ''}`;
}
