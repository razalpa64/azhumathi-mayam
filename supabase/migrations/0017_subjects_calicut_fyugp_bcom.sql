-- ============================================================================
-- 0017 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - B.Com
--        (Honours, S1-S8)
-- ----------------------------------------------------------------------------
-- Source: University of Calicut Modified Scheme and Syllabus of
-- Bachelor of Commerce Honours Programme in tune with the modified
-- CUFYUGP Regulations 2024, U.O.No. 6775/2026/Admn dated 02.05.2026
-- (the latest published B.Com Honours syllabus; the platform keeps a
-- single FYUGP-2024 scheme row, so the current syllabus is the one
-- served, as with the modified schemes used in 0009). Transcribed
-- from the published Course Structure table, the "Elective Courses
-- in Commerce" baskets and the Skill Enhancement Course list in the
-- Distribution of General Foundation Courses; nothing invented.
-- Where a course carries a dual code (e.g. COM1CJ101 / COM1MN100),
-- the major code (CJ) is used - the MN code is the same course
-- offered as a Minor to other disciplines. Printed spaces in codes
-- are removed ('COM8CJ 449' -> 'COM8CJ449').
--
-- Scope (S1-S8):
--   * All Core Courses in Major (CJ-coded) including the S6
--     Internship in Major, S8 Project / Research Project and the
--     S8 Advanced Methodology for Business Research - stored as
--     programme-level rows (specialization NULL), shared by every
--     B.Com specialisation
--   * Discipline Skill Enhancement Courses coded and titled in the
--     published foundation-course distribution (COMxFS...), S5/S6,
--     programme-level
--   * The complete Elective Courses in Major baskets. The five
--     streams that match taxonomy specializations are stored on
--     those specialization rows - FIN (Finance), COOP
--     (Co-operation), CA (Computer Applications), TTM (Travel and
--     Tourism), TAX (Taxation). The three streams with no matching
--     taxonomy specialization (Banking and Insurance, Islamic
--     Finance, Investment Banking) and the no-specialisation S8
--     electives are programme-level rows
--   * Deliberately excluded: Minor / Vocational Minor courses
--     (taken by other majors), Multi-Disciplinary / Value-Added /
--     Ability Enhancement foundation courses and the English Skill
--     Enhancement Course (university-common choices, not the
--     programme's own subjects) - same rule as 0009-0010
--
-- FYUGP is a four-year (8-semester) honours programme while B.Com
-- is seeded with 6 semesters, so Semester 7 and 8 rows for B.Com
-- are created below (subject rows stay scoped to Calicut +
-- FYUGP-2024).
--
-- Idempotent: a row is skipped when the same subject code already
-- exists for the same programme + semester + specialization +
-- scheme. Requires 0001 (schema), the seed taxonomy and 0005
-- (specializations); semesters are self-healed below.
-- ============================================================================

-- Semesters 7 and 8 for B.Com (FYUGP honours years; harmless if present)
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (7), (8)) AS t(n)
WHERE p.code = 'BCOM'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, sp.id, r.id, sem.id, v.code, v.name, 'published'
FROM (VALUES
  -- Core Courses in Major (programme-level, shared by all specialisations)
  (NULL, 1, 'COM1CJ101', 'Management Principles and Application'),
  (NULL, 2, 'COM2CJ101', 'Financial Accounting'),
  (NULL, 3, 'COM3CJ201', 'Business Regulations'),
  (NULL, 3, 'COM3CJ202', 'Corporate Accounting'),
  (NULL, 4, 'COM4CJ203', 'Corporate Regulations and Governance'),
  (NULL, 4, 'COM4CJ204', 'Applied Costing and Control'),
  (NULL, 4, 'COM4CJ205', 'Business Statistics'),
  (NULL, 5, 'COM5CJ301', 'Income Tax Law and Accounts'),
  (NULL, 5, 'COM5CJ302', 'Management Accounting'),
  (NULL, 5, 'COM5CJ303', 'Principles of Marketing'),
  (NULL, 6, 'COM6CJ304', 'Auditing and Assurance'),
  (NULL, 6, 'COM6CJ305', 'Income Tax and GST'),
  (NULL, 6, 'COM6CJ306', 'Methodology for Business Research'),
  (NULL, 6, 'COM6CJ349', 'Internship in Major'),
  (NULL, 7, 'COM7CJ401', 'Economic Environment of Business'),
  (NULL, 7, 'COM7CJ402', 'Mergers, Acquisitions and Corporate Restructuring'),
  (NULL, 7, 'COM7CJ403', 'Forensic Accounting'),
  (NULL, 7, 'COM7CJ404', 'Organizational Behaviour'),
  (NULL, 7, 'COM7CJ405', 'International Business'),
  (NULL, 8, 'COM8CJ406', 'Strategic Management'),
  (NULL, 8, 'COM8CJ407', 'Business Valuation Strategies'),
  (NULL, 8, 'COM8CJ408', 'Strategic Financial Management'),
  (NULL, 8, 'COM8CJ449', 'Project'),
  (NULL, 8, 'COM8CJ499', 'Research Project'),
  (NULL, 8, 'COM8CJ489', 'Advanced Methodology for Business Research'),
  (NULL, 8, 'COM8EJ401', 'Contemporary HR Leadership'),
  (NULL, 8, 'COM8EJ402', 'Behavioural Finance'),
  (NULL, 8, 'COM8EJ403', 'Total Quality Management'),
  -- Discipline Skill Enhancement Courses (programme-level)
  (NULL, 5, 'COM5FS112(1)', 'Advanced Spreadsheet Applications in Business'),
  (NULL, 5, 'COM5FS112(2)', 'Accounting Software Applications'),
  (NULL, 5, 'COM5FS112(3)', 'Basics of Python for Finance'),
  (NULL, 6, 'COM6FS113(1)', 'Stock Market Investment and Trading'),
  (NULL, 6, 'COM6FS113(2)', 'E-filing of Tax Returns'),
  (NULL, 6, 'COM6FS113(3)', 'Data Analysis using Statistical Software'),
  (NULL, 6, 'COM6FS113(4)', 'Basics of Financial Econometrics'),
  -- Elective baskets with no matching taxonomy specialization (programme-level)
  (NULL, 5, 'COM5EJ303(2)', 'Fundamentals of Banking and Insurance'),
  (NULL, 5, 'COM5EJ304(2)', 'Services Marketing in Banking and Insurance'),
  (NULL, 6, 'COM6EJ303(2)', 'Banking and International Finance'),
  (NULL, 6, 'COM6EJ304(2)', 'Risk Management in Banks and Insurance'),
  (NULL, 5, 'COM5EJ311(6)', 'Introduction to Islamic Commercial Banking'),
  (NULL, 5, 'COM5EJ312(6)', 'Fundamentals of Islamic Commercial Law'),
  (NULL, 6, 'COM6EJ311(6)', 'Accounting for Islamic Financial Institutions'),
  (NULL, 6, 'COM6EJ312(6)', 'Islamic Investment and Insurance'),
  (NULL, 5, 'COM5EJ315(8)', 'Fundamentals of Investment Banking'),
  (NULL, 5, 'COM5EJ316(8)', 'Essentials of Investment Banking Operations'),
  (NULL, 6, 'COM6EJ315(8)', 'Fundraising Services in Investment Banking'),
  (NULL, 6, 'COM6EJ316(8)', 'Financial Advisory Services in Investment Banking'),
  -- Finance specialisation basket
  ('FIN', 5, 'COM5EJ301(1)', 'Management of Financial Services'),
  ('FIN', 5, 'COM5EJ302(1)', 'Security Analysis and Portfolio Management'),
  ('FIN', 6, 'COM6EJ301(1)', 'Financial Derivatives'),
  ('FIN', 6, 'COM6EJ302(1)', 'Financial Management'),
  -- Co-operation specialisation basket
  ('COOP', 5, 'COM5EJ305(3)', 'Co-operative Theory and Practice'),
  ('COOP', 5, 'COM5EJ306(3)', 'Legal Environment for Co-Operatives'),
  ('COOP', 6, 'COM6EJ305(3)', 'Accounting and Taxation of Co-operatives'),
  ('COOP', 6, 'COM6EJ306(3)', 'Co-operative Management and Administration'),
  -- Computer Applications specialisation basket
  ('CA', 5, 'COM5EJ307(4)', 'Computer Applications in Business'),
  ('CA', 5, 'COM5EJ308(4)', 'Business Information Systems'),
  ('CA', 6, 'COM6EJ307(4)', 'Office Automation Tools'),
  ('CA', 6, 'COM6EJ308(4)', 'Computerized Accounting with Tally'),
  -- Travel and Tourism specialisation basket
  ('TTM', 5, 'COM5EJ309(5)', 'Tour Escort Management'),
  ('TTM', 5, 'COM5EJ310(5)', 'Tourism Resources and Products in India'),
  ('TTM', 6, 'COM6EJ309(5)', 'Tour Guiding and Leadership'),
  ('TTM', 6, 'COM6EJ310(5)', 'Itinerary Planning and Packaging'),
  -- Taxation specialisation basket
  ('TAX', 5, 'COM5EJ313(7)', 'Principles of Taxation'),
  ('TAX', 5, 'COM5EJ314(7)', 'Indirect Tax Laws and Practice'),
  ('TAX', 6, 'COM6EJ313(7)', 'Corporate Taxation and Tax Planning'),
  ('TAX', 6, 'COM6EJ314(7)', 'Income Tax Assessment')
) AS v(spec_code, semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'BCOM'
LEFT JOIN public.specializations sp
  ON sp.programme_id = p.id AND sp.code = v.spec_code
JOIN public.academic_regulations r ON r.code = 'FYUGP-2024'
JOIN public.semesters sem
  ON sem.programme_id = p.id AND sem.semester_number = v.semester_number
WHERE (v.spec_code IS NULL OR sp.id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.programme_id = p.id
      AND s.semester_id = sem.id
      AND s.specialization_id IS NOT DISTINCT FROM sp.id
      AND s.regulation_id = r.id
      AND s.subject_code = v.code
  );
