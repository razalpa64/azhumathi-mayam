// Grade scales + CGPA→percentage formulas for the universities Azhumathi
// Mayam serves. Every letter→points mapping and conversion formula below
// comes from the university's own regulations (cited in each `formulaNote`)
// — always double-check against your grade card, since schemes change with
// new regulations and points are printed there too.

export interface GradeOption {
  label: string;
  points: number;
  range?: string;
  meaning?: string;
}

export interface UniversityScale {
  id: string;
  name: string;
  shortName: string;
  system: string;
  grades: GradeOption[];
  /** CGPA (or SGPA) → equivalent percentage, per the university formula. */
  toPercentage: (gpa: number) => number;
  formulaLabel: string;
  formulaNote: string;
}

const times10 = (gpa: number) => gpa * 10;
const times10MinusHalf = (gpa: number) => (gpa - 0.5) * 10;

export const UNIVERSITY_SCALES: UniversityScale[] = [
  {
    id: 'ktu',
    name: 'APJ Abdul Kalam Technological University',
    shortName: 'KTU',
    system: 'B.Tech 2019 & 2024 schemes',
    grades: [
      { label: 'O / S', points: 10, range: '90–100', meaning: 'Outstanding' },
      { label: 'A+', points: 9, range: '85–89.99', meaning: 'Excellent' },
      { label: 'A', points: 8.5, range: '80–84.99', meaning: 'Very Good' },
      { label: 'B+', points: 8, range: '75–79.99', meaning: 'Good' },
      { label: 'B', points: 7.5, range: '70–74.99', meaning: 'Above Average' },
      { label: 'C+', points: 7, range: '65–69.99', meaning: 'Average' },
      { label: 'C', points: 6.5, range: '60–64.99', meaning: 'Satisfactory' },
      { label: 'D', points: 6, range: '55–59.99', meaning: 'Fair' },
      { label: 'P', points: 5.5, range: '50–54.99', meaning: 'Pass' },
      { label: 'F', points: 0, range: 'Below 50', meaning: 'Fail' },
    ],
    toPercentage: times10,
    formulaLabel: 'CGPA × 10',
    formulaNote:
      'Percentage = CGPA × 10, as approved by the KTU Academic Council (June 2023). Older KTU certificates used 10 × CGPA − 3.75.',
  },
  {
    id: 'calicut',
    name: 'University of Calicut',
    shortName: 'Calicut',
    system: 'CBCSS-UG / FYUGP 10-point scale',
    grades: [
      { label: 'O', points: 10, range: '90–100', meaning: 'Outstanding' },
      { label: 'A+', points: 9, range: '80–89.99', meaning: 'Excellent' },
      { label: 'A', points: 8, range: '70–79.99', meaning: 'Very Good' },
      { label: 'B+', points: 7, range: '60–69.99', meaning: 'Good' },
      { label: 'B', points: 6, range: '50–59.99', meaning: 'Above Average' },
      { label: 'C', points: 5, range: '45–49.99', meaning: 'Average' },
      { label: 'P', points: 4, range: '40–44.99', meaning: 'Pass' },
      { label: 'F', points: 0, range: 'Below 40', meaning: 'Fail' },
    ],
    toPercentage: times10,
    formulaLabel: 'CGPA × 10',
    formulaNote:
      'Current CBCSS-UG regulations convert with Percentage = CGPA × 10. Some older Calicut regulations used (CGPA − 0.75) × 10 — check the regulation printed on your grade card.',
  },
  {
    id: 'mgu',
    name: 'Mahatma Gandhi University',
    shortName: 'MG University',
    system: 'CBCSS-UG 10-point scale',
    grades: [
      { label: 'S', points: 10, range: '95–100', meaning: 'Outstanding' },
      { label: 'A+', points: 9, range: '85–94.99', meaning: 'Excellent' },
      { label: 'A', points: 8, range: '75–84.99', meaning: 'Very Good' },
      { label: 'B+', points: 7, range: '65–74.99', meaning: 'Good' },
      { label: 'B', points: 6, range: '55–64.99', meaning: 'Above Average' },
      { label: 'C', points: 5, range: '45–54.99', meaning: 'Average (min. pass)' },
      { label: 'F', points: 0, range: 'Below 45', meaning: 'Fail' },
    ],
    toPercentage: times10MinusHalf,
    formulaLabel: '(CGPA − 0.5) × 10',
    formulaNote:
      'MG University converts UG CBCSS results with Percentage = (CGPA − 0.5) × 10, per the Controller of Examinations. PG (CSS) regulations may differ — verify on your mark list.',
  },
  {
    id: 'kerala',
    name: 'University of Kerala',
    shortName: 'Kerala University',
    system: 'CBCSS (FDP) 10-point scale',
    grades: [
      { label: 'O', points: 10, range: '90–100', meaning: 'Outstanding' },
      { label: 'A+', points: 9, range: '85–89.99', meaning: 'Exceptional' },
      { label: 'A', points: 8.5, range: '80–84.99', meaning: 'Excellent' },
      { label: 'B+', points: 8, range: '75–79.99', meaning: 'Very Good' },
      { label: 'B', points: 7.5, range: '70–74.99', meaning: 'Good' },
      { label: 'C+', points: 7, range: '65–69.99', meaning: 'Above Average' },
      { label: 'C', points: 6.5, range: '60–64.99', meaning: 'Satisfactory' },
      { label: 'D+', points: 6, range: '55–59.99', meaning: 'Satisfactory' },
      { label: 'D', points: 5, range: '50–54.99', meaning: 'Pass' },
      { label: 'F', points: 0, range: 'Below 50', meaning: 'Fail' },
    ],
    toPercentage: times10,
    formulaLabel: 'CGPA × 10',
    formulaNote:
      'Percentage = CGPA × 10 (PG CSS Regulations 2020; the same equivalence applies to UG CBCSS). PG teaching-department programmes use whole points (O=10, A+=9, A=8, B+=7, B=6, C=5, D=4) — if your card shows those, its printed grade points already match this calculator.',
  },
  {
    id: 'kannur',
    name: 'Kannur University',
    shortName: 'Kannur University',
    system: 'CBCSS 10-point scale',
    grades: [
      { label: 'O', points: 10, range: '90–100', meaning: 'Outstanding' },
      { label: 'A+', points: 9, range: '80–89.99', meaning: 'Excellent' },
      { label: 'A', points: 8, range: '70–79.99', meaning: 'Very Good' },
      { label: 'B+', points: 7, range: '60–69.99', meaning: 'Good' },
      { label: 'B', points: 6, range: '50–59.99', meaning: 'Above Average' },
      { label: 'C', points: 5, range: '45–49.99', meaning: 'Average' },
      { label: 'P', points: 4, range: '40–44.99', meaning: 'Pass' },
      { label: 'F', points: 0, range: 'Below 40', meaning: 'Fail' },
    ],
    toPercentage: times10,
    formulaLabel: 'CGPA × 10',
    formulaNote:
      'Kannur University CBCSS converts with Percentage = CGPA × 10. Grade points are printed on your grade card — confirm the letters match before relying on the result.',
  },
  {
    id: 'cusat',
    name: 'Cochin University of Science and Technology',
    shortName: 'CUSAT',
    system: 'B.Tech regulations (2019) absolute grading',
    grades: [
      { label: 'S', points: 10, range: '90–100', meaning: 'Outstanding' },
      { label: 'A', points: 9, range: '80–89.99', meaning: 'Excellent' },
      { label: 'B', points: 8, range: '70–79.99', meaning: 'Very Good' },
      { label: 'C', points: 7, range: '60–69.99', meaning: 'Good' },
      { label: 'D', points: 6, range: '50–59.99', meaning: 'Pass' },
      { label: 'F', points: 0, range: 'Below 50', meaning: 'Fail' },
    ],
    toPercentage: times10MinusHalf,
    formulaLabel: '(CGPA − 0.5) × 10',
    formulaNote:
      'CUSAT regulations convert with Percentage marks = (GPA or CGPA − 0.5) × 10. Classification: 8.0+ First Class with Distinction, 6.5+ First Class.',
  },
];

export const DEFAULT_SCALE_ID = 'ktu';

export function getUniversityScale(id: string | null | undefined): UniversityScale {
  return UNIVERSITY_SCALES.find((s) => s.id === id) || UNIVERSITY_SCALES[0];
}

/**
 * Which grade scale belongs to a student's university profile.
 *
 * Used to open the calculator on the student's own scale instead of asking a
 * KTU student to pick KTU out of six universities — and to keep Calicut's
 * grade table off a KTU student's page.
 *
 * `short_name` is the reliable key (KTU, KU, MGU, CU, KNU, CUSAT); the full
 * name is the fallback for a university added through the admin panel.
 */
const SCALE_BY_SHORT_NAME: Record<string, string> = {
  KTU: 'ktu',
  KU: 'kerala',
  MGU: 'mgu',
  CU: 'calicut',
  KNU: 'kannur',
  CUSAT: 'cusat',
};

export function scaleIdForUniversity(
  university?: { short_name?: string | null; name?: string | null } | null
): string | null {
  if (!university) return null;

  const short = (university.short_name || '').trim().toUpperCase();
  if (SCALE_BY_SHORT_NAME[short]) return SCALE_BY_SHORT_NAME[short];

  const hay = (university.name || '').toLowerCase();
  if (!hay) return null;

  // CUSAT before "technological": its full name is "Cochin University of
  // Science and Technology".
  if (hay.includes('cusat') || hay.includes('cochin')) return 'cusat';
  if (hay.includes('kalam') || hay.includes('technological')) return 'ktu';
  if (hay.includes('calicut')) return 'calicut';
  if (hay.includes('mahatma') || hay.includes('gandhi')) return 'mgu';
  if (hay.includes('kannur')) return 'kannur';
  if (hay.includes('kerala')) return 'kerala';

  return null;
}
