import type {
  Programme,
  Specialization,
  Subject,
  University,
} from '@/types/database';

/**
 * Students must only ever be offered programmes and branches that
 * actually have subjects behind them. The taxonomy legitimately
 * contains many programmes/branches whose syllabi have not been
 * seeded yet — leaving them in student pickers strands students on
 * empty dashboards and makes staff verify every section by hand.
 *
 * These helpers derive "what has content" from the subjects
 * themselves, so a programme/branch appears in student pickers
 * automatically the moment its first subject is seeded, and
 * disappears if it has none. Admin taxonomy tools do NOT use this:
 * staff always see the full taxonomy.
 */
export function seededIdSets(
  subjects: Pick<Subject, 'programme_id' | 'specialization_id'>[]
): { programmeIds: Set<string>; specializationIds: Set<string> } {
  const programmeIds = new Set<string>();
  const specializationIds = new Set<string>();
  for (const s of subjects) {
    if (s.programme_id) programmeIds.add(s.programme_id);
    if (s.specialization_id) specializationIds.add(s.specialization_id);
  }
  return { programmeIds, specializationIds };
}

export function filterTaxonomyToSeeded(
  taxonomy: {
    universities: University[];
    programmes: Programme[];
    specializations: Specialization[];
  },
  subjects: Pick<Subject, 'programme_id' | 'specialization_id'>[]
): {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
} {
  const { programmeIds, specializationIds } = seededIdSets(subjects);
  const programmes = taxonomy.programmes.filter((p) => programmeIds.has(p.id));
  const specializations = taxonomy.specializations.filter((s) =>
    specializationIds.has(s.id)
  );
  // Universities are NEVER filtered by seeded content. Programmes in this
  // schema are university-agnostic (one B.Tech/B.Sc/BA row is shared by
  // every university), so `programmes.university_id` is null almost
  // everywhere. Deriving the university list from it emptied the picker
  // entirely — students saw an empty "Select University" dropdown. All
  // six universities the app supports must always be offered; the
  // university is what selects the right regulation/scheme.
  return { universities: taxonomy.universities, programmes, specializations };
}
