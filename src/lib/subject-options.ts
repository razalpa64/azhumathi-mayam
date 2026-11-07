import type { Subject } from '@/types/database';

export interface SubjectOptionScope {
  programmeId?: string;
  semesterId?: string;
  /** Specialization chosen in the UI ('' / undefined = any). Keeps that
   *  branch's rows plus shared (NULL specialization) rows. */
  specializationId?: string;
  /** Effective scheme. Rows carrying a different non-NULL regulation are
   *  dropped, so KTU-2019 and KTU-2024 subjects never mix in one list. */
  regulationId?: string;
  /** Effective university; same NULL-tolerant matching as regulation. */
  universityId?: string;
  /** When several branch copies of one course survive scoping, this
   *  branch's copy represents the course (e.g. the student's own). */
  preferSpecializationId?: string;
  /** Always keep this exact row as its course's representative (e.g. a
   *  subject already selected via a dashboard card link). */
  pinnedSubjectId?: string;
  /** With no semester chosen, offer one option per course code instead
   *  of one per semester the course appears in. */
  collapseAcrossSemesters?: boolean;
}

/**
 * Builds the option list for a subject picker: first scope to the
 * programme / semester / specialization / scheme / university in play,
 * then collapse branch copies of the same course to a single option.
 *
 * The database legitimately stores some courses once per branch (they
 * are only shared by a subset of branches, so they cannot be one shared
 * row without leaking into other branches' lists). A picker must still
 * show each course once — that is what the collapse does, preferring
 * the pinned row, then the preferred branch's copy, then a shared row.
 *
 * Input order is preserved (callers pass subjects ordered by code), so
 * the options stay sorted by course code.
 */
export function buildSubjectOptions(
  subjects: Subject[],
  scope: SubjectOptionScope
): Subject[] {
  const filtered = subjects.filter((s) => {
    if (scope.programmeId && s.programme_id !== scope.programmeId) return false;
    if (scope.semesterId && s.semester_id !== scope.semesterId) return false;
    if (
      scope.specializationId &&
      s.specialization_id &&
      s.specialization_id !== scope.specializationId
    ) {
      return false;
    }
    if (scope.regulationId && s.regulation_id && s.regulation_id !== scope.regulationId) {
      return false;
    }
    if (scope.universityId && s.university_id && s.university_id !== scope.universityId) {
      return false;
    }
    return true;
  });

  const rank = (s: Subject): number => {
    if (scope.pinnedSubjectId && s.id === scope.pinnedSubjectId) return 0;
    if (
      scope.preferSpecializationId &&
      s.specialization_id === scope.preferSpecializationId
    ) {
      return 1;
    }
    if (s.specialization_id === null) return 2;
    return 3;
  };

  const byKey = new Map<string, Subject>();
  for (const s of filtered) {
    const key = scope.collapseAcrossSemesters
      ? s.subject_code
      : `${s.semester_id}|${s.subject_code}`;
    const current = byKey.get(key);
    if (!current || rank(s) < rank(current)) {
      byKey.set(key, s);
    }
  }
  return [...byKey.values()];
}
