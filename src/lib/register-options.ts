import type { Programme, Semester } from '@/types/database';

/**
 * Which programmes the sign-up form may offer.
 *
 * The form is a chain: programme → semester → branch → scheme. Every link
 * after the first depends on the programme, so a programme whose semester
 * picker cannot be filled turns the rest of the form into dead fields. A
 * programme with no semester rows is therefore not offered.
 *
 * The rule degrades safely in both directions, because "no rows arrived"
 * and "nothing is configured" must never both end in an empty picker:
 *
 *   • no programme at all            → empty (nothing to offer)
 *   • no semester rows at all        → offer every programme (unknown data,
 *                                      and a programme can still be picked)
 *   • some programmes have no terms  → offer only the ones that do, and
 *   • if that leaves nothing         → offer every programme anyway
 */
export function programmesWithSemesters(
  programmes: Programme[],
  semesters: Semester[]
): Programme[] {
  if (programmes.length === 0) return [];

  const programmeIdsWithSemesters = new Set(
    semesters.map((semester) => semester.programme_id)
  );
  if (programmeIdsWithSemesters.size === 0) return programmes;

  const withSemesters = programmes.filter((programme) =>
    programmeIdsWithSemesters.has(programme.id)
  );

  return withSemesters.length > 0 ? withSemesters : programmes;
}

/**
 * Semesters to show for the chosen programme, in order.
 */
export function semestersForProgramme(
  semesters: Semester[],
  programmeId: string | null | undefined
): Semester[] {
  if (!programmeId) return [];
  return semesters
    .filter((semester) => semester.programme_id === programmeId)
    .sort((a, b) => a.semester_number - b.semester_number);
}
