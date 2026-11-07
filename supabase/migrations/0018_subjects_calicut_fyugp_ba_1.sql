-- ============================================================================
-- 0018 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - B.A.
--        (Honours, S1-S8), part 1: English Language and Literature,
--        Malayalam Language and Literature
-- ----------------------------------------------------------------------------
-- Sources (latest published versions, University of Calicut):
--   * English Language and Literature: Corrected Scheme & Syllabus,
--     U.O.No. 9906/2025/Admn dated 07.07.2025 (correcting U.O.No.
--     10404/2024 and U.O.No. 14034/2024)
--   * Malayalam Language and Literature: Scheme & Syllabus,
--     U.O.No. 10400/2024/Admn dated 29.06.2024
-- Transcribed from the published Course Structure tables, the
-- "Distribution of Major Courses" tables, the Elective Courses in
-- Major baskets (with and without specialisation) and the Skill
-- Enhancement Course lists in the Distribution of General
-- Foundation Courses; nothing invented. Where a course carries a
-- dual code (e.g. ENG1CJ101 / ENG1MN100), the major code (CJ) is
-- used - the MN code is the same course offered as a Minor to
-- other disciplines. Printed spaces in codes are removed.
-- Core titles are stored without the "Core Course N in Major -"
-- descriptor prefix used in the structure tables.
--
-- Scope per major (S1-S8): all Core Courses in Major (CJ-coded)
-- including the S6 Internship in Major, S8 Project / Research
-- Project and S8 Research Methodology; discipline Skill
-- Enhancement Courses coded and titled in the published tables;
-- the complete in-major Elective baskets. Deliberately excluded:
-- Minor / Vocational Minor courses (taken by other majors),
-- Multi-Disciplinary / Value-Added / Ability Enhancement
-- foundation courses and the English/language Skill Enhancement
-- Course (university-common choices) - same rule as 0009-0010.
--
-- Source notes:
--   * English ENG5EJ308 (Shakespeare Studies) is printed with
--     Semester 6 in the no-specialisation basket table while its
--     code places it in Semester 5 (with ENG5EJ307); it is stored
--     in Semester 5, following the code, so the S5 elective pair
--     is complete.
--   * Malayalam course titles are printed in Malayalam script
--     with an English gloss; the English gloss is stored. The
--     Malayalam scheme prints its SEC option codes with hyphen
--     suffixes (MAL5FS112-1/-2, MAL6FS113-1/-2); they are stored
--     as printed. "Malayalam for Presentations" is dual-coded
--     MAL5FS112-2 / MAL6FS113-2 (colleges opt it in S5 or S6),
--     so it is stored in both semesters under each printed code.
--
-- FYUGP is a four-year (8-semester) honours programme while B.A.
-- is seeded with 6 semesters, so Semester 7 and 8 rows for B.A.
-- are created below (subject rows stay scoped to Calicut +
-- FYUGP-2024 and to each major's specialization row).
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
  -- ===== English Language and Literature (ENG) =====
  ('ENG', 1, 'ENG1CJ101', 'Introduction to the World of Literature'),
  ('ENG', 2, 'ENG2CJ101', 'Reading Fiction'),
  ('ENG', 3, 'ENG3CJ201', 'Drama: Exploring the Literary and Performative Elements'),
  ('ENG', 3, 'ENG3CJ202', 'Language in Action'),
  ('ENG', 4, 'ENG4CJ203', 'Journey Through The World of Poetry'),
  ('ENG', 4, 'ENG4CJ204', 'Literary Criticism'),
  ('ENG', 4, 'ENG4CJ205', 'Gender Perspectives in Literatures'),
  ('ENG', 5, 'ENG5CJ301', 'Fundamentals of Film Studies'),
  ('ENG', 5, 'ENG5CJ302', 'Foundations of Literary Theory'),
  ('ENG', 5, 'ENG5CJ303', 'Introduction to Language and Linguistics'),
  ('ENG', 5, 'ENG5FS112', 'Translation in Praxis'),
  ('ENG', 5, 'ENG5EJ301(1)', 'Indian Literatures: Selected Readings'),
  ('ENG', 5, 'ENG5EJ302(1)', 'Indian Aesthetics: An Introduction'),
  ('ENG', 5, 'ENG5EJ303(2)', 'Literature and Race'),
  ('ENG', 5, 'ENG5EJ304(2)', 'Narratives of Middle East'),
  ('ENG', 5, 'ENG5EJ305(3)', 'New Humanities and Literature'),
  ('ENG', 5, 'ENG5EJ306(3)', 'Literature and Oceanic Studies'),
  ('ENG', 5, 'ENG5EJ307', 'Folk and Oral Tales from Across the World'),
  ('ENG', 5, 'ENG5EJ308', 'Shakespeare Studies'),
  ('ENG', 6, 'ENG6CJ304', 'Narrative Constructs in Non-Fiction'),
  ('ENG', 6, 'ENG6CJ305', 'Introducing Cultural Studies'),
  ('ENG', 6, 'ENG6CJ306', 'Literature and Ecology'),
  ('ENG', 6, 'ENG6CJ349', 'Internship in Major'),
  ('ENG', 6, 'ENG6FS113', 'Academic Writing'),
  ('ENG', 6, 'ENG6EJ301(1)', 'Dalit Literature: An Overview'),
  ('ENG', 6, 'ENG6EJ302(1)', 'Indian Women Writings'),
  ('ENG', 6, 'ENG6EJ303(2)', 'Adaptations in Literature'),
  ('ENG', 6, 'ENG6EJ304(2)', 'Geopolitical Dynamics in Literature'),
  ('ENG', 6, 'ENG6EJ305(3)', 'Literature, Science and Technology'),
  ('ENG', 6, 'ENG6EJ306(3)', 'Digital Narratives'),
  ('ENG', 6, 'ENG6EJ307', 'Reading World Classics'),
  ('ENG', 6, 'ENG6EJ308', 'Introduction to Disability Studies'),
  ('ENG', 7, 'ENG7CJ401', 'British Literature: Chaucer to 19th Century'),
  ('ENG', 7, 'ENG7CJ402', 'British Literature: From 20th Century to 21st Century'),
  ('ENG', 7, 'ENG7CJ403', 'American Literature'),
  ('ENG', 7, 'ENG7CJ404', 'Advanced Critical Theory'),
  ('ENG', 7, 'ENG7CJ405', 'Post Colonial Studies'),
  ('ENG', 8, 'ENG8CJ406', 'Advanced Linguistics'),
  ('ENG', 8, 'ENG8CJ407', 'Art, Literature and Aesthetics'),
  ('ENG', 8, 'ENG8CJ408', 'South Asian Literature'),
  ('ENG', 8, 'ENG8CJ449', 'Project'),
  ('ENG', 8, 'ENG8CJ499', 'Research Project'),
  ('ENG', 8, 'ENG8CJ489', 'Basics of Research Methodology'),
  ('ENG', 8, 'ENG8EJ401', 'Practical Literary Analysis'),
  ('ENG', 8, 'ENG8EJ402', 'English Language Teaching'),
  ('ENG', 8, 'ENG8EJ403', 'Applied Translation Studies'),
  ('ENG', 8, 'ENG8EJ404', 'Writings of the Self'),
  ('ENG', 8, 'ENG8EJ405', 'Contemporary Writings from Kerala'),
  ('ENG', 8, 'ENG8EJ406', 'Creative Writing'),
  -- ===== Malayalam Language and Literature (MAL) =====
  ('MAL', 1, 'MAL1CJ101', 'Introduction to Malayalam Poetry'),
  ('MAL', 2, 'MAL2CJ101', 'Introduction to Malayalam Short Stories'),
  ('MAL', 3, 'MAL3CJ201', 'Introduction to Malayalam Novel'),
  ('MAL', 3, 'MAL3CJ202', 'Introduction to Malayalam Criticism'),
  ('MAL', 4, 'MAL4CJ203', 'Malayalam Prose'),
  ('MAL', 4, 'MAL4CJ204', 'Visual Art Studies of Kerala'),
  ('MAL', 4, 'MAL4CJ205', 'Kerala Culture'),
  ('MAL', 5, 'MAL5CJ301', 'Malayalam Grammar'),
  ('MAL', 5, 'MAL5CJ302', 'Ancient and Medieval Literature'),
  ('MAL', 5, 'MAL5CJ303', 'Literary Theories - Indian'),
  ('MAL', 5, 'MAL5FS112-1', 'Malayalam for Competitive Examinations'),
  ('MAL', 5, 'MAL5FS112-2', 'Malayalam for Presentations'),
  ('MAL', 5, 'MAL5EJ301(1)', 'Translation Theories'),
  ('MAL', 5, 'MAL5EJ302(1)', 'Academic Translation'),
  ('MAL', 5, 'MAL5EJ303(2)', 'Print Media Studies'),
  ('MAL', 5, 'MAL5EJ304(2)', 'Audio Visual Media Studies'),
  ('MAL', 5, 'MAL5EJ305(3)', 'Film History'),
  ('MAL', 5, 'MAL5EJ306(3)', 'Screenplay Studies'),
  ('MAL', 5, 'MAL5EJ307', 'Folklore'),
  ('MAL', 5, 'MAL5EJ308', 'Travelogue'),
  ('MAL', 5, 'MAL5EJ309', 'Arabi Malayalam and Mappila Literature'),
  ('MAL', 5, 'MAL5EJ310', 'Author Study - Kumaranasan'),
  ('MAL', 5, 'MAL5EJ311', 'Author Study - Basheer'),
  ('MAL', 6, 'MAL6CJ304', 'Linguistics'),
  ('MAL', 6, 'MAL6CJ305', 'History of Malayalam Language'),
  ('MAL', 6, 'MAL6CJ306', 'Literary Theories - Western'),
  ('MAL', 6, 'MAL6CJ349', 'Internship in Major'),
  ('MAL', 6, 'MAL6FS113-1', 'Malayalam Composition'),
  ('MAL', 6, 'MAL6FS113-2', 'Malayalam for Presentations'),
  ('MAL', 6, 'MAL6EJ301(1)', 'Creative Translation'),
  ('MAL', 6, 'MAL6EJ302(1)', 'Adaptation'),
  ('MAL', 6, 'MAL6EJ303(2)', 'New Media Studies'),
  ('MAL', 6, 'MAL6EJ304(2)', 'Media Criticism'),
  ('MAL', 6, 'MAL6EJ305(3)', 'Film Technology'),
  ('MAL', 6, 'MAL6EJ306(3)', 'Film Appreciation'),
  ('MAL', 6, 'MAL6EJ312', 'Popular Culture'),
  ('MAL', 6, 'MAL6EJ313', 'Tribal Studies'),
  ('MAL', 6, 'MAL6EJ314', 'Language Computing'),
  ('MAL', 6, 'MAL6EJ315', 'Author Study - Vailoppilli'),
  ('MAL', 6, 'MAL6EJ316', 'Author Study - Madhavikkutty'),
  ('MAL', 7, 'MAL7CJ401', 'Malayalam Poetry Studies'),
  ('MAL', 7, 'MAL7CJ402', 'Malayalam Short Story Studies'),
  ('MAL', 7, 'MAL7CJ403', 'Malayalam Novel Studies'),
  ('MAL', 7, 'MAL7CJ404', 'Malayalam Criticism Studies'),
  ('MAL', 7, 'MAL7CJ405', 'Malayalam Theatre Studies'),
  ('MAL', 8, 'MAL8CJ406', 'Language Technology'),
  ('MAL', 8, 'MAL8CJ407', 'Contemporary Writings'),
  ('MAL', 8, 'MAL8CJ408', 'Literary Approaches'),
  ('MAL', 8, 'MAL8CJ449', 'Project'),
  ('MAL', 8, 'MAL8CJ499', 'Research Project'),
  ('MAL', 8, 'MAL8CJ489', 'Research Methodology'),
  ('MAL', 8, 'MAL8EJ401', 'Evolution of Malayalam Language'),
  ('MAL', 8, 'MAL8EJ402', 'History of Early Malayalam Literature'),
  ('MAL', 8, 'MAL8EJ403', 'History of Modern Malayalam Literature'),
  ('MAL', 8, 'MAL8EJ404', 'Study of Kerala Arts'),
  ('MAL', 8, 'MAL8EJ405', 'Manipravalam Literature'),
  ('MAL', 8, 'MAL8EJ406', 'Pattu Literature'),
  ('MAL', 8, 'MAL8EJ407', 'Kerala Thought'),
  ('MAL', 8, 'MAL8EJ408', 'Author Study - C.V. Raman Pillai'),
  ('MAL', 8, 'MAL8EJ409', 'Author Study - Kuttikrishna Marar')
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
