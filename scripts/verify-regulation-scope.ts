/**
 * Scheme picker rules — a plain assertion script, no test framework.
 *
 * `profiles.regulation_id` filters subjects on the dashboard, semester,
 * courses, materials and planner pages, so a student picking a scheme
 * from the wrong university ends up with an empty library. These cases
 * pin the rule in src/lib/regulation-scope.ts to what the universities
 * actually run, including the awkward ones (KTU is not on the Kerala
 * common regulations; a PG student never sees a UG scheme).
 *
 * Run: npm run test:schemes
 */
import { applicableSchemes } from '@/lib/regulation-scope';
import type { AcademicRegulation, Programme } from '@/types/database';

const stamp = '2026-01-01T00:00:00.000Z';

function regulation(
  id: string,
  universityId: string | null,
  programmeId: string | null,
  code: string,
  name: string,
  displayOrder: number
): AcademicRegulation {
  return {
    id,
    university_id: universityId,
    programme_id: programmeId,
    code,
    name,
    batch_range: null,
    is_active: true,
    display_order: displayOrder,
    created_at: stamp,
    updated_at: stamp,
  };
}

function programme(id: string, code: string, level: Programme['degree_level']): Programme {
  return {
    id,
    university_id: null,
    code,
    name: code,
    full_title: null,
    degree_level: level,
    total_semesters: 8,
    has_specializations: false,
    description: null,
    is_active: true,
    display_order: 1,
    created_at: stamp,
    updated_at: stamp,
  };
}

const programmes = [
  programme('btech', 'BTECH', 'UG'),
  programme('bsc', 'BSC', 'UG'),
  programme('mcom', 'MCOM', 'PG'),
];

// The rows the platform actually ships (supabase/seed.sql).
const regulations = [
  regulation('ktu-2024', 'ktu', 'btech', 'KTU-2024', 'KTU 2024 Scheme', 1),
  regulation('ktu-2019', 'ktu', 'btech', 'KTU-2019', 'KTU 2019 Scheme', 2),
  regulation('fyugp', null, null, 'FYUGP-2024', 'Kerala FYUGP 2024 Regulation', 3),
  regulation('cbcss', null, null, 'CBCSS-UG', 'CBCSS Undergraduate Regulation', 4),
  regulation('css-pg', null, null, 'CSS-PG', 'Credit & Semester System (PG)', 5),
];

const cases: {
  label: string;
  universityId: string | null;
  programmeId: string | null;
  expected: string[];
}[] = [
  { label: 'nothing chosen yet', universityId: null, programmeId: null, expected: [] },
  {
    label: 'KTU before a programme is picked',
    universityId: 'ktu',
    programmeId: null,
    expected: ['KTU-2024', 'KTU-2019'],
  },
  {
    label: 'KTU + B.Tech never sees FYUGP/CBCSS',
    universityId: 'ktu',
    programmeId: 'btech',
    expected: ['KTU-2024', 'KTU-2019'],
  },
  {
    label: 'KTU + PG falls back to the shared PG scheme',
    universityId: 'ktu',
    programmeId: 'mcom',
    expected: ['CSS-PG'],
  },
  {
    label: 'Calicut follows the shared Kerala regulations',
    universityId: 'cu',
    programmeId: null,
    expected: ['FYUGP-2024', 'CBCSS-UG', 'CSS-PG'],
  },
  {
    label: 'Calicut + B.Sc hides the PG scheme',
    universityId: 'cu',
    programmeId: 'bsc',
    expected: ['FYUGP-2024', 'CBCSS-UG'],
  },
  {
    label: 'Calicut + M.Com shows only the PG scheme',
    universityId: 'cu',
    programmeId: 'mcom',
    expected: ['CSS-PG'],
  },
  {
    label: 'MGU has no rows of its own, so it gets the shared UG ones',
    universityId: 'mgu',
    programmeId: 'bsc',
    expected: ['FYUGP-2024', 'CBCSS-UG'],
  },
  {
    label: 'another university never sees KTU schemes',
    universityId: 'cusat',
    programmeId: 'btech',
    expected: ['FYUGP-2024', 'CBCSS-UG'],
  },
];

let failures = 0;

for (const testCase of cases) {
  const actual = applicableSchemes({
    regulations,
    programmes,
    universityId: testCase.universityId,
    programmeId: testCase.programmeId,
  }).map((row) => row.code);

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
  console.error(`\n${failures} scheme rule(s) broken.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} scheme rules hold.`);
