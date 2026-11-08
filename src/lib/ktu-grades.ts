/**
 * KTU (APJ Abdul Kalam Technological University) 10-point grade
 * scale, 2019 & 2024 schemes. The 2024 scheme calls the top grade
 * "O" (Outstanding), the 2019 scheme calls it "S" — both are worth
 * 10 points, so they share a row.
 */
export const KTU_GRADES = [
  { label: 'O / S', points: 10, range: '90% & above' },
  { label: 'A+', points: 9, range: '80 – 89%' },
  { label: 'A', points: 8.5, range: '75 – 79%' },
  { label: 'B+', points: 8, range: '70 – 74%' },
  { label: 'B', points: 7.5, range: '65 – 69%' },
  { label: 'C+', points: 7, range: '60 – 64%' },
  { label: 'C', points: 6.5, range: '55 – 59%' },
  { label: 'D', points: 6, range: '50 – 54%' },
  { label: 'P', points: 5.5, range: '45 – 49% (pass)' },
  { label: 'F', points: 0, range: 'Below 45% (fail)' },
] as const;
