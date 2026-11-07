-- ============================================================================
-- 0020 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - B.A.
--        (Honours, S1-S8), part 3: Political Science
-- ----------------------------------------------------------------------------
-- Source: University of Calicut Scheme & Syllabus of B.A. Political
-- Science Honours Programme in tune with the CUFYUGP Regulations
-- 2024, U.O.No. 10849/2024/Admn dated 08.07.2024. Transcribed
-- from the published Course Structure table, the "Distribution of
-- Major Courses" table, the Elective Courses in Political Science
-- baskets (with and without specialisation) and the Skill
-- Enhancement Course list in the Distribution of General
-- Foundation Courses in Political Science; nothing
-- invented. Where a course carries a dual code (e.g. POL1CJ101 /
-- POL1MN100), the major code (CJ) is used - the MN code is the
-- same course offered as a Minor to other disciplines. Printed
-- spaces in codes are removed. Core titles are stored without
-- the "Core Course N in Major -" descriptor prefix used in the
-- structure tables.
--
-- Scope (S1-S8): all Core Courses in Major (CJ-coded) including
-- the S6 Internship in Major, S8 Project / Research Project and
-- S8 Research Methodology; discipline Skill Enhancement Courses
-- coded and titled in the published tables; the complete
-- in-major Elective baskets (with and without specialisation).
-- Deliberately excluded: Minor / Vocational Minor courses
-- (taken by other majors), Multi-Disciplinary / Value-Added /
-- Ability Enhancement foundation courses and the
-- English/language Skill Enhancement Course (university-common
-- choices) - same rule as 0009-0010 and 0018-0019.
--
-- Source notes:
--   * Elective titles are stored as printed, including
--     "Ethnomonationalism" (POL8EJ404) and "Globalizations and
--     It's Changing Impact" (POL8EJ409).
--   * The no-specialisation basket as published contains only
--     Semester 6 and Semester 8 courses (no S5 rows).
--
-- FYUGP is a four-year (8-semester) honours programme; Semester 7
-- and 8 rows for B.A. are created by 0018 (and harmlessly
-- re-asserted here). Subject rows stay scoped to Calicut +
-- FYUGP-2024 and to the Political Science specialization row.
--
-- Idempotent: a row is skipped when the same subject code already
-- exists for the same programme + semester + specialization +
-- scheme. Requires 0001 (schema), the seed taxonomy and 0005
-- (specializations); semesters are self-healed below.
-- ============================================================================

-- Semesters 7 and 8 for B.A. (FYUGP honours years; harmless if present)
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (7), (8)) AS t(n)
WHERE p.code = 'BA'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, sp.id, r.id, sem.id, v.code, v.name, 'published'
FROM (VALUES
  ('POL', 1, 'POL1CJ101', 'Foundations of Political Science'),
  ('POL', 2, 'POL2CJ102', 'Concepts of Political Science'),
  ('POL', 3, 'POL3CJ201', 'Indian Constitution'),
  ('POL', 3, 'POL3CJ202', 'Government and Politics in India'),
  ('POL', 4, 'POL4CJ203', 'Ancient and Medieval Political Thought'),
  ('POL', 4, 'POL4CJ204', 'Modern Political Analysis and Political Sociology'),
  ('POL', 4, 'POL4CJ205', 'Introduction to International Relations'),
  ('POL', 5, 'POL5CJ301', 'Western Political Thought'),
  ('POL', 5, 'POL5CJ302', 'Comparative Politics'),
  ('POL', 5, 'POL5CJ303', 'Indian Political Thought'),
  ('POL', 5, 'POL5FS112', 'Political Reporting'),
  ('POL', 5, 'POL5EJ301(1)', 'Security Studies'),
  ('POL', 5, 'POL5EJ302(1)', 'South Asian Politics'),
  ('POL', 5, 'POL5EJ303(2)', 'Social Movements and Contentious Politics'),
  ('POL', 5, 'POL5EJ304(2)', 'Environment and Politics'),
  ('POL', 6, 'POL6CJ304', 'Theoretical Foundations of Human Rights'),
  ('POL', 6, 'POL6CJ305', 'Principles of Public Administration'),
  ('POL', 6, 'POL6CJ306', 'State, Society and Political Process in Kerala'),
  ('POL', 6, 'POL6CJ349', 'Internship in Major'),
  ('POL', 6, 'POL6FS113', 'Electoral Management and Political Campaign'),
  ('POL', 6, 'POL6EJ301(1)', 'Issues in International Politics'),
  ('POL', 6, 'POL6EJ302(1)', 'International Organizations and Global Governance'),
  ('POL', 6, 'POL6EJ303(2)', 'Human Rights in India'),
  ('POL', 6, 'POL6EJ304(2)', 'Disability and Citizenship'),
  ('POL', 6, 'POL6EJ305', 'Citizenship and Diaspora'),
  ('POL', 6, 'POL6EJ306', 'Women''s Rights'),
  ('POL', 6, 'POL6EJ307', 'Marginality and Social Exclusion'),
  ('POL', 6, 'POL6EJ308', 'Conflict Resolutions and Peace Studies'),
  ('POL', 6, 'POL6EJ309', 'Postcolonial International Relations'),
  ('POL', 6, 'POL6EJ310', 'Advances in Political Psychology'),
  ('POL', 6, 'POL6EJ311', 'Understanding Identity Politics'),
  ('POL', 7, 'POL7CJ401', 'Gender Politics'),
  ('POL', 7, 'POL7CJ402', 'Geopolitics'),
  ('POL', 7, 'POL7CJ403', 'Public Policy'),
  ('POL', 7, 'POL7CJ404', 'India''s Foreign Policy'),
  ('POL', 7, 'POL7CJ405', 'Indian Polity: Issues and Challenges'),
  ('POL', 8, 'POL8CJ406', 'Citizenship and Ethnic Minorities'),
  ('POL', 8, 'POL8CJ407', 'Indian Administration'),
  ('POL', 8, 'POL8CJ408', 'Political Theory: Marxian Tradition'),
  ('POL', 8, 'POL8CJ449', 'Project'),
  ('POL', 8, 'POL8CJ499', 'Research Project'),
  ('POL', 8, 'POL8CJ489', 'Research Methodology in Political Science'),
  ('POL', 8, 'POL8EJ404', 'Ethnicity, Ethnomonationalism and Ethnic Conflicts'),
  ('POL', 8, 'POL8EJ405', 'Theoretical Foundations of Eco-Politics'),
  ('POL', 8, 'POL8EJ406', 'Gender in International Relations'),
  ('POL', 8, 'POL8EJ407', 'Political Economy'),
  ('POL', 8, 'POL8EJ408', 'Literature in International Relations'),
  ('POL', 8, 'POL8EJ409', 'Globalizations and It''s Changing Impact')
) AS v(spec_code, semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'BA'
JOIN public.specializations sp
  ON sp.programme_id = p.id AND sp.code = v.spec_code
JOIN public.academic_regulations r ON r.code = 'FYUGP-2024'
JOIN public.semesters sem
  ON sem.programme_id = p.id AND sem.semester_number = v.semester_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s
  WHERE s.programme_id = p.id
    AND s.semester_id = sem.id
    AND s.specialization_id = sp.id
    AND s.regulation_id = r.id
    AND s.subject_code = v.code
);
