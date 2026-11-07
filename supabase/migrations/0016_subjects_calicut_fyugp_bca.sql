-- ============================================================================
-- 0016 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - BCA
--        (Honours, S1-S8). BCA has no specializations in the taxonomy:
--        it is a single major, so subjects are programme-level rows.
-- ----------------------------------------------------------------------------
-- Source: University of Calicut official Scheme & Syllabus of
-- Bachelor of Computer Applications Honours Programme (B.C.A) in
-- tune with the CUFYUGP Regulations 2024, U.O.No. 9925/2024/Admn
-- dated 22.06.2024, with effect from 2024 admission onwards.
-- Transcribed from the published Course Structure table and the
-- "Elective Courses in BCA" baskets (with and without
-- specialisation); nothing invented. Where a course carries a dual
-- code (e.g. BCA1CJ102 / BCA1MN101), the major code (CJ) is used -
-- the MN code is the same course offered as a Minor to other
-- disciplines. Printed spaces in codes are removed.
--
-- Scope (S1-S8):
--   * All Core Courses in Major (CJ-coded)
--   * The complete published Elective Courses in Major baskets:
--     the four specialisation groups (Image Processing, Computer
--     Networks, Cloud Computing, Data Science and AI) for S5/S6,
--     and the no-specialisation basket for S7/S8 (the structure
--     table prints these elective slots with an (X) placeholder;
--     the stored codes use the basket group suffixes as published)
--   * Discipline Skill Enhancement Courses printed with a code and
--     title in the semester structure (BCAxFS...), including the
--     Internship / Project / Research Project courses, which the
--     BCA scheme codes as FS courses
--   * Deliberately excluded: Minor courses (taken by other majors),
--     the Open Elective, Multi-Disciplinary / Value-Added / Ability
--     Enhancement foundation courses (university-common choices,
--     not the programme's own subjects) - same rule as 0009-0010
--
-- FYUGP is a four-year (8-semester) honours programme while BCA is
-- seeded with 6 semesters, so Semester 7 and 8 rows for BCA are
-- created below (subject rows stay scoped to Calicut + FYUGP-2024).
--
-- Idempotent: a row is skipped when the same subject code already
-- exists for the same programme + semester + scheme. Requires 0001
-- (schema) and the seed taxonomy; semesters are self-healed below.
-- ============================================================================

-- Semesters 7 and 8 for BCA (FYUGP honours years; harmless if present)
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (7), (8)) AS t(n)
WHERE p.code = 'BCA'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, NULL, r.id, sem.id, v.code, v.name, 'published'
FROM (VALUES
  -- Semester 1
  (1, 'BCA1CJ101', 'Fundamentals of Computers and Computational Thinking'),
  (1, 'BCA1CJ102', 'Mathematical Foundation for Computer Applications'),
  (1, 'BCA1CJ103', 'Discrete Structures for Computer Applications'),
  (1, 'BCA1FS111', 'Introduction to Computers and Office Automation'),
  -- Semester 2
  (2, 'BCA2CJ101', 'Fundamentals of Programming (C Language)'),
  (2, 'BCA2CJ102', 'Statistical Foundation for Computer Applications'),
  (2, 'BCA2CJ103', 'Numerical Analysis and Optimization Techniques'),
  (2, 'BCA2FS112', 'Data Analysis using Spread Sheet'),
  -- Semester 3
  (3, 'BCA3CJ201', 'Data Structures using C'),
  (3, 'BCA3CJ202', 'Computer Networks'),
  (3, 'BCA3CJ203', 'Introduction to Data Science'),
  (3, 'BCA3CJ204', 'Foundations of Artificial Intelligence'),
  (3, 'BCA3FS113', 'Website Designing using Content Management System'),
  -- Semester 4
  (4, 'BCA4CJ205', 'Database Management System'),
  (4, 'BCA4CJ206', 'Python Programming'),
  (4, 'BCA4CJ207', 'Software Engineering'),
  (4, 'BCA4CJ208', 'Automation and Robotics'),
  -- Semester 5: core + skill/internship + elective basket (4 groups)
  (5, 'BCA5CJ301', 'Object Oriented Programming (Java)'),
  (5, 'BCA5CJ302', 'Progressive Web Application using PHP'),
  (5, 'BCA5CJ303', 'Digital Fundamentals and Computer Organization'),
  (5, 'BCA5FS114', 'Professional Skill Development for IT Career Excellence'),
  (5, 'BCA5FS115', 'Internship-1'),
  (5, 'BCA5EJ301(1)', 'Fundamentals of Digital Image Processing'),
  (5, 'BCA5EJ302(1)', 'Pattern Recognition'),
  (5, 'BCA5EJ301(2)', 'Wireless Communication'),
  (5, 'BCA5EJ302(2)', 'Cryptography and Network Security'),
  (5, 'BCA5EJ301(3)', 'Cloud Computing'),
  (5, 'BCA5EJ302(3)', 'Cloud Computing Security and Privacy in Cloud'),
  (5, 'BCA5EJ301(4)', 'Data Analytics and Visualization'),
  (5, 'BCA5EJ302(4)', 'Knowledge Engineering'),
  -- Semester 6: core + project + elective basket (4 groups)
  (6, 'BCA6CJ304', 'Introduction to AI and ML'),
  (6, 'BCA6CJ305', 'Principles of Operating System'),
  (6, 'BCA6FS116', 'Project-1'),
  (6, 'BCA6EJ303(1)', 'Advanced Digital Image Processing and Computer Vision'),
  (6, 'BCA6EJ304(1)', 'Applied Digital Image Processing'),
  (6, 'BCA6EJ303(2)', 'Storage Area Network'),
  (6, 'BCA6EJ304(2)', 'Internet of Things'),
  (6, 'BCA6EJ303(3)', 'Storage Technologies'),
  (6, 'BCA6EJ304(3)', 'Virtualization'),
  (6, 'BCA6EJ303(4)', 'Advanced Python for Data Science'),
  (6, 'BCA6EJ304(4)', 'Neural Networks and Deep Learning'),
  -- Semester 7: core + no-specialisation electives + internship
  (7, 'BCA7CJ401', 'Advanced Data Structures and Algorithms'),
  (7, 'BCA7CJ402', 'Data Science Programming using R'),
  (7, 'BCA7EJ401(1)', 'Theory of Computation'),
  (7, 'BCA7EJ401(2)', 'Expert Systems and Fuzzy Logic'),
  (7, 'BCA7EJ401(3)', 'Modern Cryptography'),
  (7, 'BCA7EJ402(1)', 'Client Server Architecture'),
  (7, 'BCA7EJ402(2)', 'Blockchain Technology'),
  (7, 'BCA7EJ402(3)', 'Data Mining'),
  (7, 'BCA7EJ403(1)', 'Research Methodology in Computer Science'),
  (7, 'BCA7FS117', 'Internship-2'),
  -- Semester 8: no-specialisation electives + project / research project
  (8, 'BCA8EJ404(1)', 'Compiler Design'),
  (8, 'BCA8EJ404(2)', 'Mixed Reality'),
  (8, 'BCA8EJ405(1)', 'Mastering Java Web Development'),
  (8, 'BCA8EJ405(2)', 'Social Network Analysis'),
  (8, 'BCA8EJ406(1)', 'System Security'),
  (8, 'BCA8EJ406(2)', 'Parallel Computing'),
  (8, 'BCA8FS118', 'Project-2'),
  (8, 'BCA8FS119', 'Research Project')
) AS v(semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'BCA'
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
