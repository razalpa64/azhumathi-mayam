/**
 * Taxonomy fallbacks — a plain assertion script, no test framework.
 *
 * `filterTaxonomyToSeeded` exists so students are not offered programmes
 * with no subjects behind them. It must never read "the subject scan failed
 * or came back empty" as "nothing is available": that emptied the sign-up
 * programme picker and made registration impossible.
 *
 * Run: npm run test:taxonomy
 */
import { filterTaxonomyToSeeded, seededIdSets } from '@/lib/seeded-taxonomy';
import { programmesWithSemesters, semestersForProgramme } from '@/lib/register-options';
import type { Programme, Semester, Specialization, Subject, University } from '@/types/database';

const stamp = '2026-01-01T00:00:00.000Z';

function university(id: string, short: string): University {
  return {
    id,
    name: short,
    short_name: short,
    location: null,
    website_url: null,
    logo_url: null,
    is_active: true,
    display_order: 1,
    created_at: stamp,
    updated_at: stamp,
  } as University;
}

function programme(id: string, code: string): Programme {
  return {
    id,
    university_id: null,
    code,
    name: code,
    full_title: null,
    degree_level: 'UG',
    total_semesters: 6,
    has_specializations: false,
    description: null,
    is_active: true,
    display_order: 1,
    created_at: stamp,
    updated_at: stamp,
  };
}

function specialization(id: string, programmeId: string, code: string): Specialization {
  return {
    id,
    programme_id: programmeId,
    code,
    name: code,
    is_active: true,
    display_order: 1,
    created_at: stamp,
    updated_at: stamp,
  } as Specialization;
}

const taxonomy = {
  universities: [university('u1', 'KTU')],
  programmes: [programme('p1', 'B.Tech'), programme('p2', 'B.Sc')],
  specializations: [specialization('s1', 'p1', 'CSE'), specialization('s2', 'p2', 'PHY')],
};

type ScopeRow = Pick<Subject, 'programme_id' | 'specialization_id'>;

// `subjects.programme_id` is NOT NULL in the schema, so every row names one.
const subject = (programmeId: string, specializationId: string | null): ScopeRow => ({
  programme_id: programmeId,
  specialization_id: specializationId,
});

const cases: { label: string; subjects: ScopeRow[]; programmes: string[] }[] = [
  {
    label: 'no subject rows at all keeps every programme (failed scan, not an empty site)',
    subjects: [],
    programmes: ['B.Tech', 'B.Sc'],
  },
  {
    label: 'subjects for one programme hide the other',
    subjects: [subject('p1', 's1')],
    programmes: ['B.Tech'],
  },
  {
    label: 'subjects for both programmes keep both',
    subjects: [subject('p1', 's1'), subject('p2', 's2')],
    programmes: ['B.Tech', 'B.Sc'],
  },
];

let failures = 0;

for (const testCase of cases) {
  const result = filterTaxonomyToSeeded(taxonomy, testCase.subjects);
  const actual = result.programmes.map((p) => p.name);
  const ok = JSON.stringify(actual) === JSON.stringify(testCase.programmes);
  if (!ok) {
    failures += 1;
    console.error(`FAIL  ${testCase.label}`);
    console.error(`      expected ${JSON.stringify(testCase.programmes)}`);
    console.error(`      received ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok    ${testCase.label}`);
  }
}

// Universities are never narrowed — programmes are university-agnostic in
// this schema, so filtering them emptied the picker once already.
const neverFiltered = filterTaxonomyToSeeded(taxonomy, [subject('p1', null)]);
if (neverFiltered.universities.length !== taxonomy.universities.length) {
  failures += 1;
  console.error('FAIL  universities must never be filtered by seeded content');
} else {
  console.log('ok    universities are never filtered');
}

// --- Sign-up picker chain -------------------------------------------------

function semester(id: string, programmeId: string, number: number): Semester {
  return {
    id,
    programme_id: programmeId,
    semester_number: number,
    label: `Semester ${number}`,
    is_active: true,
    created_at: stamp,
    updated_at: stamp,
  };
}

const registerCases: { label: string; programmes: Programme[]; semesters: Semester[]; expected: string[] }[] = [
  {
    label: 'sign-up: a programme with no semesters is not offered',
    programmes: taxonomy.programmes,
    semesters: [semester('sem1', 'p1', 1)],
    expected: ['B.Tech'],
  },
  {
    label: 'sign-up: no semester rows at all still offers every programme',
    programmes: taxonomy.programmes,
    semesters: [],
    expected: ['B.Tech', 'B.Sc'],
  },
  {
    label: 'sign-up: semesters for unknown programmes do not empty the list',
    programmes: taxonomy.programmes,
    semesters: [semester('sem9', 'gone', 1)],
    expected: ['B.Tech', 'B.Sc'],
  },
];

for (const testCase of registerCases) {
  const actual = programmesWithSemesters(testCase.programmes, testCase.semesters).map((p) => p.name);
  const ok = JSON.stringify(actual) === JSON.stringify(testCase.expected);
  if (!ok) {
    failures += 1;
    console.error(`FAIL  ${testCase.label}`);
    console.error(`      expected ${JSON.stringify(testCase.expected)}`);
    console.error(`      received ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok    ${testCase.label}`);
  }
}

const terms = semestersForProgramme(
  [semester('s2', 'p1', 2), semester('s1', 'p1', 1), semester('s9', 'p2', 1)],
  'p1'
);
if (terms.map((t) => t.semester_number).join(',') !== '1,2') {
  failures += 1;
  console.error('FAIL  sign-up: semesters should be the programme\'s own, in order');
} else {
  console.log('ok    sign-up: semesters are the programme\'s own, in order');
}

// The id sets themselves stay honest.
const sets = seededIdSets([subject('p1', 's1')]);
if (!sets.programmeIds.has('p1') || !sets.specializationIds.has('s1')) {
  failures += 1;
  console.error('FAIL  seededIdSets should collect programme and specialization ids');
} else {
  console.log('ok    seededIdSets collects ids');
}

if (failures > 0) {
  console.error(`\n${failures} taxonomy rule(s) broken.`);
  process.exit(1);
}

console.log('\nAll taxonomy rules hold.');
