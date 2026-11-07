-- ============================================================================
-- 0019 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - B.A.
--        (Honours, S1-S8), part 2: Economics, History
-- ----------------------------------------------------------------------------
-- Sources (University of Calicut):
--   * Economics: Corrected Scheme & Syllabus, U.O.No. 12232/2024/
--     Admn dated 06.08.2024
--   * History: Scheme & Syllabus, U.O.No. 12623/2024/Admn dated
--     16.08.2024. The corrected syllabus (U.O.No. 1802/2025/Admn
--     dated 01.02.2025) rectified only the mark distribution of
--     courses; course codes and titles are as in the 2024 scheme
--     transcribed here.
-- Transcribed from the published Course Structure tables, the
-- "Distribution of Major Courses" tables, the Elective Courses in
-- Major lists and the Skill Enhancement Course lists in the
-- Distribution of General Foundation Courses; nothing invented.
-- Where a course carries a dual code (e.g. ECO1CJ101 /
-- ECO1MN100), the major code (CJ) is used - the MN code is the
-- same course offered as a Minor to other disciplines. Printed
-- spaces in codes are removed. Core titles are stored without
-- the "Core Course N in Major -" descriptor prefix used in the
-- structure tables.
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
--   * Economics prints its S8 research-methodology options as
--     ECO8CJ489 (1) / ECO8CJ489 (2) (quantitative / qualitative);
--     both are stored.
--   * History prints hyphen-suffixed SEC codes. Its S5 SEC
--     options are dual-coded HIS4FS112-x / HIS5FS112-x; they are
--     stored under the HIS5FS112-x codes in Semester 5.
--
-- FYUGP is a four-year (8-semester) honours programme; Semester 7
-- and 8 rows for B.A. are created by 0018 (and harmlessly
-- re-asserted here). Subject rows stay scoped to Calicut +
-- FYUGP-2024 and to each major's specialization row.
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
  -- ===== Economics (ECON) =====
  ('ECON', 1, 'ECO1CJ101', 'Principles of Economics'),
  ('ECON', 2, 'ECO2CJ102', 'Budget Analysis'),
  ('ECON', 3, 'ECO3CJ201', 'Analytical Tools for Economics - I'),
  ('ECON', 3, 'ECO3CJ202', 'Evolution of Economic Theories'),
  ('ECON', 4, 'ECO4CJ203', 'Intermediate Microeconomics'),
  ('ECON', 4, 'ECO4CJ204', 'Intermediate Macroeconomics'),
  ('ECON', 4, 'ECO4CJ205', 'Analytical Tools for Economics - II'),
  ('ECON', 5, 'ECO5CJ301', 'Advanced Microeconomics'),
  ('ECON', 5, 'ECO5CJ302', 'International Trade Theories'),
  ('ECON', 5, 'ECO5CJ303', 'Growth Theories in Economics'),
  ('ECON', 5, 'ECO5FS112', 'Big Data Analysis in Economics'),
  ('ECON', 5, 'ECO5EJ301', 'Gender Analysis in Economics'),
  ('ECON', 5, 'ECO5EJ302', 'Environment and Sustainable Development'),
  ('ECON', 5, 'ECO5EJ303', 'Economic Database Management'),
  ('ECON', 5, 'ECO5EJ304', 'Economics of Labour Market'),
  ('ECON', 5, 'ECO5EJ305', 'Health Economics'),
  ('ECON', 5, 'ECO5EJ306', 'Human Capital and Economic Development'),
  ('ECON', 6, 'ECO6CJ304', 'Development Issues in Indian Economy'),
  ('ECON', 6, 'ECO6CJ305', 'Elementary Econometrics'),
  ('ECON', 6, 'ECO6CJ306', 'Advanced Macroeconomics'),
  ('ECON', 6, 'ECO6CJ349', 'Internship in Major'),
  ('ECON', 6, 'ECO6FS113', 'Economic Research with R'),
  ('ECON', 6, 'ECO6EJ307', 'Industrial Economics'),
  ('ECON', 6, 'ECO6EJ308', 'Agricultural Economics'),
  ('ECON', 6, 'ECO6EJ309', 'Indian Financial Market'),
  ('ECON', 6, 'ECO6EJ310', 'Demography'),
  ('ECON', 6, 'ECO6EJ311', 'Basic Methods for Economic Research'),
  ('ECON', 6, 'ECO6EJ312', 'Economic Geography'),
  ('ECON', 7, 'ECO7CJ401', 'Time Series Econometrics'),
  ('ECON', 7, 'ECO7CJ402', 'Game Theory and Economic Behaviour'),
  ('ECON', 7, 'ECO7CJ403', 'Development Theories and Models'),
  ('ECON', 7, 'ECO7CJ404', 'Balance of Payments and Exchange Market'),
  ('ECON', 7, 'ECO7CJ405', 'Development Issues in Kerala'),
  ('ECON', 8, 'ECO8CJ406', 'Macroeconomic Models and Measurement'),
  ('ECON', 8, 'ECO8CJ407', 'Applied Microeconomics and Evaluation'),
  ('ECON', 8, 'ECO8CJ408', 'Heterodox Economics'),
  ('ECON', 8, 'ECO8CJ449', 'Project'),
  ('ECON', 8, 'ECO8CJ499', 'Research Project'),
  ('ECON', 8, 'ECO8CJ489(1)', 'Methods for Quantitative Research in Economics'),
  ('ECON', 8, 'ECO8CJ489(2)', 'Methods for Qualitative Research in Economics'),
  ('ECON', 8, 'ECO8EJ401', 'Social Choice Theory'),
  ('ECON', 8, 'ECO8EJ402', 'Banking and Insurance'),
  ('ECON', 8, 'ECO8EJ403', 'Economics of Education'),
  ('ECON', 8, 'ECO8EJ404', 'Law and Economics'),
  ('ECON', 8, 'ECO8EJ405', 'Local Level Planning'),
  ('ECON', 8, 'ECO8EJ406', 'Finance and Technology'),
  -- ===== History (HIST) =====
  ('HIST', 1, 'HIS1CJ101', 'History of Keralam up to 12th CE'),
  ('HIST', 2, 'HIS2CJ101', 'History of Keralam from 13th CE to 18th CE'),
  ('HIST', 3, 'HIS3CJ201', 'History of India up to 6th CE'),
  ('HIST', 3, 'HIS3CJ202', 'History of Keralam from 19th CE to the Present'),
  ('HIST', 4, 'HIS4CJ203', 'History of India from 7th CE to 18th CE'),
  ('HIST', 4, 'HIS4CJ204', 'History of World up to 5th CE'),
  ('HIST', 4, 'HIS4CJ205', 'History of World from 6th CE to 15th CE'),
  ('HIST', 5, 'HIS5CJ301', 'History of India from 18th CE to 1947'),
  ('HIST', 5, 'HIS5CJ302', 'History of World from 16th CE to 1848'),
  ('HIST', 5, 'HIS5CJ303', 'School of Historical Thoughts'),
  ('HIST', 5, 'HIS5FS112-1', 'Heritage Walk and Field Survey'),
  ('HIST', 5, 'HIS5FS112-2', 'Cartography and Map Making'),
  ('HIST', 5, 'HIS5FS112-3', 'Practicing Paleography: Brahmi and Vattezhuthu'),
  ('HIST', 5, 'HIS5EJ301', 'Gender in History'),
  ('HIST', 5, 'HIS5EJ302', 'Exploring the Historical Geography of India'),
  ('HIST', 5, 'HIS5EJ303', 'Indian Heritage and Multiculturalism in Historical Perspective'),
  ('HIST', 5, 'HIS5EJ304', 'History of Science, Technology and Medicine in Colonial India'),
  ('HIST', 5, 'HIS5EJ305', 'History of Human Rights'),
  ('HIST', 5, 'HIS5EJ306', 'Fascism in Historical Perspectives'),
  ('HIST', 6, 'HIS6CJ304', 'History of India from 1947 to the Present'),
  ('HIST', 6, 'HIS6CJ305', 'History of the World from 19th CE to the Present'),
  ('HIST', 6, 'HIS6CJ306', 'Writing History - Methods and Practice'),
  ('HIST', 6, 'HIS6CJ349', 'Internship in Major'),
  ('HIST', 6, 'HIS6FS113-1', 'Intellectual Property Right (IPR) in History'),
  ('HIST', 6, 'HIS6FS113-2', 'Digital History'),
  ('HIST', 6, 'HIS6FS113-3', 'Museology and Conservation'),
  ('HIST', 6, 'HIS6FS113-4', 'Pottery Studies in Historical Perspective'),
  ('HIST', 6, 'HIS6EJ301', 'History of Indian Archaeology'),
  ('HIST', 6, 'HIS6EJ302', 'An Introduction to Indian Epigraphy'),
  ('HIST', 6, 'HIS6EJ303', 'Numismatics and History'),
  ('HIST', 6, 'HIS6EJ304', 'Archival Science and Digital Documentation'),
  ('HIST', 6, 'HIS6EJ305', 'Artificial Intelligence and the Study of History'),
  ('HIST', 6, 'HIS6EJ306', 'Writing Oral History'),
  ('HIST', 7, 'HIS7CJ401', 'History and Theory'),
  ('HIST', 7, 'HIS7CJ402', 'History of Keralam: Problems and Perspectives'),
  ('HIST', 7, 'HIS7CJ403', 'Selected Themes in Indian History'),
  ('HIST', 7, 'HIS7CJ404', 'Selected Themes in World History'),
  ('HIST', 7, 'HIS7CJ405', 'Selected Themes in South Indian History'),
  ('HIST', 8, 'HIS8CJ406', 'Sources in Historical Studies'),
  ('HIST', 8, 'HIS8CJ407', 'Research in Local History - Methods and Practice'),
  ('HIST', 8, 'HIS8CJ408', 'History of Kerala Education'),
  ('HIST', 8, 'HIS8CJ449', 'Project'),
  ('HIST', 8, 'HIS8CJ499', 'Research Project'),
  ('HIST', 8, 'HIS8CJ489', 'Research Methodology in History'),
  ('HIST', 8, 'HIS8EJ401', 'History of Marginalized in Kerala'),
  ('HIST', 8, 'HIS8EJ402', 'Kerala and Indian Ocean'),
  ('HIST', 8, 'HIS8EJ403', 'History of Prisons and Prison Life in Kerala'),
  ('HIST', 8, 'HIS8EJ404', 'Selected Themes in Cultural Histories of Modern India'),
  ('HIST', 8, 'HIS8EJ405', 'Urban Culture of Modern India'),
  ('HIST', 8, 'HIS8EJ406', 'Printing and the Arrival of Books'),
  ('HIST', 8, 'HIS8EJ407', 'History of Kerala School of Mathematics')
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
