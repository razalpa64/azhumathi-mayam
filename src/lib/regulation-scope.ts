import type { AcademicRegulation, Programme } from '@/types/database';

/**
 * Which regulation / scheme a student may pick.
 *
 * The database models this only loosely: `academic_regulations` may name a
 * university and/or a programme, but it may also name neither — a "shared"
 * row. A naive picker therefore showed every student every scheme, and a
 * KTU student could happily choose the Calicut FYUGP regulation. That is
 * not cosmetic: `profiles.regulation_id` filters subjects on the dashboard,
 * semester, courses, materials and planner pages, so the wrong pick empties
 * the student's whole library.
 *
 * The rules below follow what the universities actually run, cross-checked
 * against the schemes attached to the published subjects:
 *
 *   • A scheme that names a university belongs to that university alone.
 *   • A shared scheme (no university) is shown to a university only when
 *     that university does not run a scheme of its own at the same degree
 *     level. The KTU 2019 / KTU 2024 schemes are KTU's own; a KTU student
 *     is not on FYUGP or CBCSS, so those never appear for KTU. The other
 *     Kerala universities have no rows of their own yet, so they get the
 *     shared FYUGP / CBCSS / CSS schemes — which are exactly what they
 *     follow.
 *   • A scheme is hidden when its degree level contradicts the chosen
 *     programme (CSS-PG is not offered to a B.Tech student). Rows whose
 *     level cannot be determined are always offered — never guess a fact
 *     into hiding something a student needs.
 *   • Nothing is offered before a university is chosen; the picker tells
 *     the student to choose one first instead of showing a mixed pile.
 *
 * The programme a scheme names is deliberately *not* used to filter: one
 * B.Tech row serves every university, so "KTU 2024 Scheme" is scoped to
 * the B.Tech programme in the data while remaining the scheme for other
 * KTU undergraduate degrees. Filtering on it would empty the list.
 */
export type DegreeLevel = Programme['degree_level'];

function schemeLevel(
  regulation: AcademicRegulation,
  programmeById: Map<string, Programme>
): DegreeLevel | null {
  if (regulation.programme_id) {
    const programme = programmeById.get(regulation.programme_id);
    if (programme) return programme.degree_level;
  }
  const text = `${regulation.code} ${regulation.name}`.toUpperCase();
  // `\bPG\b` matches "CSS-PG" and "(PG)" but not the "PG" inside "FYUGP".
  if (/\bPG\b|POSTGRADUATE|POST GRADUATE|MASTER/.test(text)) return 'PG';
  if (/\bUG\b|UNDERGRADUATE|UNDER GRADUATE|FYUGP|CBCSS/.test(text)) return 'UG';
  return null;
}

/** University's own schemes first, then shared ones, both in staff order. */
function byStaffOrder(a: AcademicRegulation, b: AcademicRegulation): number {
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  return a.name.localeCompare(b.name);
}

export interface SchemeScopeInput {
  regulations: AcademicRegulation[];
  programmes: Programme[];
  universityId: string | null | undefined;
  programmeId: string | null | undefined;
}

/**
 * The scheme options to show for one university (and, when the student has
 * picked one, one programme). Returns `[]` until a university is chosen.
 */
export function applicableSchemes({
  regulations,
  programmes,
  universityId,
  programmeId,
}: SchemeScopeInput): AcademicRegulation[] {
  if (!universityId) return [];

  const programmeById = new Map(programmes.map((programme) => [programme.id, programme]));
  const active = regulations.filter((regulation) => regulation.is_active !== false);

  const own = active.filter((regulation) => regulation.university_id === universityId);
  const shared = active.filter((regulation) => regulation.university_id === null);

  const selectedProgramme = programmeId ? programmeById.get(programmeId) : undefined;
  const level = selectedProgramme?.degree_level ?? null;

  if (level) {
    const matchesLevel = (regulation: AcademicRegulation) => {
      const regulationLevel = schemeLevel(regulation, programmeById);
      return regulationLevel === null || regulationLevel === level;
    };

    const ownAtLevel = own.filter(matchesLevel);
    if (ownAtLevel.length > 0) return ownAtLevel.sort(byStaffOrder);

    const sharedAtLevel = shared.filter(matchesLevel);
    if (sharedAtLevel.length > 0) return sharedAtLevel.sort(byStaffOrder);

    // Nothing matches the programme level (e.g. a diploma row): fall back
    // to the university's own schemes rather than an empty picker.
    if (own.length > 0) return own.sort(byStaffOrder);
    return shared.sort(byStaffOrder);
  }

  // No programme yet: the university's own schemes are the whole answer
  // when it has any. Otherwise show the shared ones it follows.
  return (own.length > 0 ? own : shared).sort(byStaffOrder);
}

/**
 * Keep a selection only while it is still on offer. Returns the id to hold,
 * or `''` to clear it — the one place both pickers agree on the rule.
 */
export function keepValidSchemeId(
  currentId: string,
  options: AcademicRegulation[]
): string {
  if (currentId && options.some((option) => option.id === currentId)) return currentId;
  return '';
}
