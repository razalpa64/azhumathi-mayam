/**
 * Branch-picker rules — a plain assertion script, no test framework.
 *
 * `programmes.has_specializations` is what decides whether a student is ever
 * asked for a branch. BBA, BCA, MCA (and LLB, once it is added) are single
 * courses: the flag is false and no branch picker may appear, anywhere.
 *
 * The flag used to be stored and never read, so these cases pin the rule in
 * src/lib/programme-branches.ts — and catch the two ways it went wrong in
 * production: an empty picker for a no-branch degree, and a picker filled
 * with another programme's branches because a stray row was filed under the
 * wrong programme.
 *
 * Run: npm run test:branches
 */
import { branchesForProgramme, programmeHasBranches } from '@/lib/programme-branches';
import type { Programme, Specialization } from '@/types/database';

const stamp = '2026-01-01T00:00:00.000Z';

function programme(id: string, code: string, hasSpecializations: boolean): Programme {
  return {
    id,
    university_id: null,
    code,
    name: code,
    full_title: null,
    degree_level: 'UG',
    total_semesters: 6,
    has_specializations: hasSpecializations,
    description: null,
    is_active: true,
    display_order: 0,
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
    description: null,
    is_active: true,
    display_order: 0,
    created_at: stamp,
    updated_at: stamp,
  };
}

const btech = programme('btech', 'BTECH', true);
const bba = programme('bba', 'BBA', false);
const bca = programme('bca', 'BCA', false);

// BBA once 0027 has run: the flag on, and the three Calicut streams filed
// under it. This is the shape the sign-up form must accept — the "no branches"
// answer for BBA was correct only for as long as the data said so.
const bbaWithStreams = programme('bba-streams', 'BBA', true);

const specializations = [
  specialization('cse', 'btech', 'CSE'),
  specialization('ece', 'btech', 'ECE'),
  // A stray row filed under BBA while the flag was never read — this is what
  // made BBA show a "specialization" picker full of engineering branches.
  specialization('stray', 'bba', 'CSE'),
  specialization('fin', 'bba-streams', 'FIN'),
  specialization('mkt', 'bba-streams', 'MKT'),
  specialization('hrm', 'bba-streams', 'HRM'),
];

const cases: { label: string; run: () => unknown; expected: unknown }[] = [
  {
    label: 'BTech is a degree with branches',
    run: () => programmeHasBranches(btech),
    expected: true,
  },
  {
    label: 'BBA is a single course, no branches',
    run: () => programmeHasBranches(bba),
    expected: false,
  },
  {
    label: 'BCA is a single course, no branches',
    run: () => programmeHasBranches(bca),
    expected: false,
  },
  {
    label: 'no programme chosen yet -> no branches',
    run: () => programmeHasBranches(null),
    expected: false,
  },
  {
    label: 'BTech gets its own branches only',
    run: () => branchesForProgramme(specializations, btech).map((s) => s.code),
    expected: ['CSE', 'ECE'],
  },
  {
    label: 'BBA never gets a branch list, even with a stray row',
    run: () => branchesForProgramme(specializations, bba).map((s) => s.code),
    expected: [],
  },
  {
    label: 'BCA never gets a branch list',
    run: () => branchesForProgramme(specializations, bca).map((s) => s.code),
    expected: [],
  },
  {
    label: 'no programme -> no branch list (never the whole taxonomy)',
    run: () => branchesForProgramme(specializations, null).map((s) => s.code),
    expected: [],
  },
  {
    label: 'a programme missing from taxonomy -> no branch list',
    run: () =>
      branchesForProgramme(specializations, { id: 'ghost', has_specializations: true } as Programme).map(
        (s) => s.code
      ),
    expected: [],
  },
  {
    label: 'BBA with the Calicut streams is asked for a branch',
    run: () => programmeHasBranches(bbaWithStreams),
    expected: true,
  },
  {
    label: 'BBA offers exactly Finance, Marketing and HRM',
    run: () => branchesForProgramme(specializations, bbaWithStreams).map((s) => s.code),
    expected: ['FIN', 'MKT', 'HRM'],
  },
  {
    label: 'BBA is asked for a branch only once it has one of its own',
    run: () => branchesForProgramme(specializations, bba).map((s) => s.code),
    expected: [],
  },
  {
    label: 'a branch never leaks into another degree',
    run: () =>
      branchesForProgramme(specializations, programme('bcom', 'BCOM', true)).map((s) => s.code),
    expected: [],
  },
];

let failures = 0;

for (const testCase of cases) {
  const actual = testCase.run();
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

if (failures > 0) {
  console.error(`\n${failures} branch rule(s) broken.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} branch rules hold.`);
