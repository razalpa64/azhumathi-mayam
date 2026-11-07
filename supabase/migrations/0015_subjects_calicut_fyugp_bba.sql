-- ============================================================================
-- 0015 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - BBA
--        (Honours, S1-S8). BBA has no specializations in the taxonomy:
--        it is a single major, so subjects are programme-level rows.
-- ----------------------------------------------------------------------------
-- Source: University of Calicut official Scheme & Syllabus of BBA
-- Honours Programme in tune with the CUFYUGP Regulations 2024 and
-- AICTE guidelines, U.O.No. 9589/2024/Admn dated 19.06.2024, with
-- effect from 2024 admission onwards. Transcribed from the published
-- Course Structure table and the "Elective Courses in BBA" baskets
-- (with and without specialisation); nothing invented. Where a course
-- carries a dual code (e.g. BBA1CJ102 / BBA1MN101), the major code
-- (CJ) is used - the MN code is the same course offered as a Minor
-- to other disciplines. Printed spaces in codes are removed.
--
-- Scope (S1-S8):
--   * All Core Courses in Major (CJ-coded)
--   * The complete published Elective Courses in Major baskets:
--     the seven specialisation groups (Finance, Human Resource
--     Management, Marketing Management, Operations Management,
--     Logistics, Business Analytics, Entrepreneurship) for S5/S6,
--     and the no-specialisation basket for S7/S8
--   * Discipline Skill Enhancement Courses printed with a code and
--     title in the semester structure (BBAxFS...), including the
--     Internship / Project / Research Project courses, which the
--     BBA scheme codes as FS courses
--   * Deliberately excluded: Minor courses (taken by other majors),
--     the Open Elective, Multi-Disciplinary / Value-Added / Ability
--     Enhancement foundation courses (university-common choices,
--     not the programme's own subjects) - same rule as 0009-0010
--
-- One source inconsistency, resolved for the semester structure
-- table (the authoritative semester-wise layout): the foundation
-- course distribution table mislabels Communicating with AI as
-- BBA5FS115; the S5 structure table prints it as BBA5FS114 and
-- Internship-1 as BBA5FS115, which is what is used here.
--
-- FYUGP is a four-year (8-semester) honours programme while BBA is
-- seeded with 6 semesters, so Semester 7 and 8 rows for BBA are
-- created below (subject rows stay scoped to Calicut + FYUGP-2024).
--
-- Idempotent: a row is skipped when the same subject code already
-- exists for the same programme + semester + scheme. Requires 0001
-- (schema) and the seed taxonomy; semesters are self-healed below.
-- ============================================================================

-- Semesters 7 and 8 for BBA (FYUGP honours years; harmless if present)
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (7), (8)) AS t(n)
WHERE p.code = 'BBA'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, NULL, r.id, sem.id, v.code, v.name, 'published'
FROM (VALUES
  -- Semester 1
  (1, 'BBA1CJ101', 'Foundations in Business Decision'),
  (1, 'BBA1CJ102', 'Marketing Management'),
  (1, 'BBA1CJ103', 'Communicating with Financial Data'),
  (1, 'BBA1FS111', 'Digital Marketing for Business'),
  -- Semester 2
  (2, 'BBA2CJ101', 'Business Economics'),
  (2, 'BBA2CJ102', 'Financial Management'),
  (2, 'BBA2CJ103', 'Foundations for Business Analytics'),
  (2, 'BBA2FS112', 'Spreadsheet Modelling for Business'),
  -- Semester 3
  (3, 'BBA3CJ201', 'Domestic Logistic Management'),
  (3, 'BBA3CJ202', 'Business & Corporate Regulations'),
  (3, 'BBA3CJ203', 'Human Resource Management'),
  (3, 'BBA3CJ204', 'Strategic Cost Analysis'),
  (3, 'BBA3FS113', 'Skills for Employability'),
  -- Semester 4
  (4, 'BBA4CJ205', 'Decision Science'),
  (4, 'BBA4CJ206', 'Organization Behaviour'),
  (4, 'BBA4CJ207', 'Entrepreneurship Essentials'),
  (4, 'BBA4CJ208', 'Corporate Governance & Ethics'),
  -- Semester 5: core + skill/internship + elective basket (7 groups)
  (5, 'BBA5CJ301', 'Operations Management'),
  (5, 'BBA5CJ302', 'Behavioral Finance'),
  (5, 'BBA5CJ303', 'Business Research Methods'),
  (5, 'BBA5FS114', 'Communicating with AI'),
  (5, 'BBA5FS115', 'Internship-1'),
  (5, 'BBA5EJ301(1)', 'Security Analysis & Portfolio Management'),
  (5, 'BBA5EJ302(1)', 'Financial Derivatives'),
  (5, 'BBA5EJ303(2)', 'People Management Skills'),
  (5, 'BBA5EJ304(2)', 'Performance Management'),
  (5, 'BBA5EJ305(3)', 'Consumer Behaviour & Marketing Analysis'),
  (5, 'BBA5EJ306(3)', 'Marketing Matrix'),
  (5, 'BBA5EJ307(4)', 'World Class Manufacturing'),
  (5, 'BBA5EJ308(4)', 'Quality Management'),
  (5, 'BBA5EJ309(5)', 'Logistics Management'),
  (5, 'BBA5EJ310(5)', 'Air Cargo Logistics Management'),
  (5, 'BBA5EJ311(6)', 'Data Visualization for Analytics'),
  (5, 'BBA5EJ312(6)', 'Data Analytics using R'),
  (5, 'BBA5EJ313(7)', 'Design Thinking'),
  (5, 'BBA5EJ314(7)', 'Family Business Management'),
  -- Semester 6: core + project + elective basket (7 groups)
  (6, 'BBA6CJ304', 'Networking in Business'),
  (6, 'BBA6CJ305', 'Total Quality Management'),
  (6, 'BBA6FS116', 'Project-1'),
  (6, 'BBA6EJ301(1)', 'Strategic Financial Management'),
  (6, 'BBA6EJ302(1)', 'Financial Analytics'),
  (6, 'BBA6EJ303(2)', 'Training & Development'),
  (6, 'BBA6EJ304(2)', 'HR Analytics'),
  (6, 'BBA6EJ305(3)', 'Integrated Marketing Communication'),
  (6, 'BBA6EJ306(3)', 'Strategic Hospitality Marketing'),
  (6, 'BBA6EJ307(4)', 'Total Productive Maintenance'),
  (6, 'BBA6EJ308(4)', 'Service Operations Management'),
  (6, 'BBA6EJ309(5)', 'Export & Import Policies & Procedures'),
  (6, 'BBA6EJ310(5)', 'Shipping & Ocean Freight Logistics Management'),
  (6, 'BBA6EJ311(6)', 'Data Analytics using Python'),
  (6, 'BBA6EJ312(6)', 'Advanced Data Analytics for Business Decision'),
  (6, 'BBA6EJ313(7)', 'Entrepreneurial Venture Planning and Communication Strategy'),
  (6, 'BBA6EJ314(7)', 'Social Entrepreneurship'),
  -- Semester 7
  (7, 'BBA7CJ401', 'Strategic Management'),
  (7, 'BBA7CJ402', 'Data Analysis Tools for Social Scientists'),
  (7, 'BBA7EJ401', 'Advanced Human Resource Management'),
  (7, 'BBA7EJ402', 'International Finance'),
  (7, 'BBA7EJ403', 'International Marketing'),
  (7, 'BBA7FS117', 'Internship-2'),
  -- Semester 8
  (8, 'BBA8EJ404', 'Start-Up Management'),
  (8, 'BBA8EJ405', 'Entrepreneurial Capital Management'),
  (8, 'BBA8EJ406', 'Advertising & Branding'),
  (8, 'BBA8FS118', 'Project-2'),
  (8, 'BBA8FS119', 'Research Project')
) AS v(semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'BBA'
JOIN public.academic_regulations r ON r.code = 'FYUGP-2024'
JOIN public.semesters sem
  ON sem.programme_id = p.id AND sem.semester_number = v.semester_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s
  WHERE s.programme_id = p.id
    AND s.semester_id = sem.id
    AND s.specialization_id IS NULL
    AND s.regulation_id = r.id
    AND s.subject_code = v.code
);
