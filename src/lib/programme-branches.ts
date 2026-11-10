import type { Programme, Specialization } from '@/types/database';

type ProgrammeLike = Pick<Programme, 'id' | 'has_specializations'> | null | undefined;
type SpecializationLike = Pick<Specialization, 'programme_id'>;

/**
 * Not every degree has branches.
 *
 * BBA, BCA, LLB and friends are a single course — `programmes.has_specializations`
 * is where that is recorded, and it is the only thing that should decide
 * whether the app ever asks for a branch.
 *
 * The flag used to be stored and never read, so those students were still
 * shown a "Branch / Specialization" picker: empty for most, and filled with
 * another course's branches wherever a stray row had been filed under the
 * wrong programme.
 */
export function programmeHasBranches(programme?: ProgrammeLike): boolean {
  return Boolean(programme?.has_specializations);
}

/**
 * The branches a programme can actually offer. Returns nothing — not even a
 * "General" option — when the programme is marked as having none, and never
 * returns a branch that belongs to a different programme.
 */
export function branchesForProgramme<T extends SpecializationLike>(
  specializations: T[],
  programme?: ProgrammeLike
): T[] {
  if (!programme || !programme.has_specializations) return [];
  return specializations.filter((specialization) => specialization.programme_id === programme.id);
}
