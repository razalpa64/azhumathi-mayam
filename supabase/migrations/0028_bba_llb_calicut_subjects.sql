-- ============================================================================
-- 0028 - University of Calicut B.B.A., LL.B. (Hons.) - the five-year
--        integrated double degree: programme, 10 semesters, all 61 papers
-- ----------------------------------------------------------------------------
-- Source: University of Calicut, "Regulations for the Five Year Integrated
-- Double Degree B.B.A., LL.B. (Honours) Course (From the academic year
-- 2011-2012 onwards)", approved by the Board of Studies on 02.06.2011 under
-- the Bar Council of India Rules of Legal Education 2008, as published by the
-- University and reproduced by Government Law College, Kozhikode
-- (glckozhikode.ac.in/llb) - regulations, scheme of examinations and detailed
-- syllabus. Every code, title and semester below is transcribed from that
-- scheme; nothing is invented.
--
-- The scheme is 61 papers over 10 semesters:
--   * 20 compulsory Management courses   C.M.1  - C.M.20
--   * 22 compulsory Law courses          C.L.1  - C.L.22
--   * 4  compulsory clinical courses     C.C.L.1 - C.C.L.4
--   * 6  General Electives               G.E.C.1 - G.E.C.6   (semester VIII, IX)
--   * 8  Special Electives (Business Law) S.E.C.1 - S.E.C.8  (semester IX, X)
--   * 1  Viva-Voce                       V.V.                 (semester X)
--
-- Two transcription notes:
--
-- 1. The scheme prints the codes with dots ("C.M.1", "C.C.L.1", "G.E.C.1",
--    "S.E.C.1", "V.V."). Those are stored here without the dots - CM1, CL1,
--    CCL1, GEC1, SEC1, VV - the same one-token convention every other subject
--    code in this database uses, so codes stay searchable and comparable.
--
-- 2. The elective slots are exactly that in the scheme: a student chooses the
--    paper. They are therefore stored as slots ("General Elective - 1"), not
--    expanded into the published baskets (24 General Electives, 12 Business
--    Law Special Electives listed in the same regulations) - expanding them
--    would claim a student takes all of them.
--
-- The programme is a single integrated course, so has_specializations = false:
-- the "special elective group" in the regulations is a paper choice, not a
-- branch, and no branch picker may appear for it (see 0025).
--
-- Papers carry regulation_id = NULL for the same reason as 0026: a
-- Calicut-owned academic_regulations row would become the only scheme offered
-- to every other Calicut undergraduate (applicableSchemes() in
-- src/lib/regulation-scope.ts). A NULL scheme is visible under whichever
-- scheme the student picks.
--
-- Idempotent: safe to run more than once. Semesters are self-healed below.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The programme
-- ----------------------------------------------------------------------------
INSERT INTO public.programmes
  (code, name, full_title, degree_level, total_semesters, has_specializations, description, display_order)
VALUES
  ('BALLB', 'B.B.A. LL.B', 'Bachelor of Business Administration and Bachelor of Laws (Honours)',
   'UG', 10, false,
   'Five-year integrated double degree in business administration and law - a single course with no branches.',
   14)
ON CONFLICT (code) DO UPDATE
  SET has_specializations = false;

-- ----------------------------------------------------------------------------
-- 2. Ten semesters
-- ----------------------------------------------------------------------------
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10)) AS t(n)
WHERE p.code = 'BALLB'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Every paper, in the semester the scheme puts it
-- ----------------------------------------------------------------------------
INSERT INTO public.subjects
  (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, NULL, NULL, sem.id, v.code, v.name, 'published'
FROM (VALUES
  -- Semester I
  (1, 'CM1', 'English - I'),
  (1, 'CM2', 'Principles of Management'),
  (1, 'CM3', 'Managerial Economics'),
  (1, 'CM4', 'Business Environment'),
  (1, 'CL1', 'Law of Torts and Motor Vehicles Accidents'),
  (1, 'CL2', 'General Principles of Contract'),
  -- Semester II
  (2, 'CM5', 'English - II'),
  (2, 'CM6', 'Information Technology for Managers'),
  (2, 'CM7', 'Business Ethics'),
  (2, 'CM8', 'Organizational Dynamics'),
  (2, 'CL3', 'Special Contracts'),
  (2, 'CL4', 'Constitutional Law - I'),
  -- Semester III
  (3, 'CM9', 'Business Statistics'),
  (3, 'CM10', 'Financial Accounting'),
  (3, 'CM11', 'Business Communication'),
  (3, 'CL5', 'Jurisprudence (Legal Method, Indian Legal System and Basic Theory of Law)'),
  (3, 'CL6', 'Constitutional Law - II'),
  (3, 'CL7', 'Law of Crimes - I'),
  -- Semester IV
  (4, 'CM12', 'Operations Research'),
  (4, 'CM13', 'Financial Management'),
  (4, 'CM14', 'Marketing Management'),
  (4, 'CL8', 'Family Law - I'),
  (4, 'CL9', 'Administrative Law'),
  (4, 'CL10', 'Law of Crimes - II'),
  -- Semester V
  (5, 'CM15', 'Operations Management'),
  (5, 'CM16', 'Human Resource Management'),
  (5, 'CL11', 'Law of Criminal Procedure'),
  (5, 'CL12', 'Family Law - II'),
  (5, 'CL13', 'Consumer Protection Law'),
  (5, 'CL14', 'Law of Evidence'),
  -- Semester VI
  (6, 'CM17', 'Cost and Management Accounting'),
  (6, 'CM18', 'Investment Management'),
  (6, 'CL15', 'Company Law'),
  (6, 'CL16', 'Labour Law - I'),
  (6, 'CL17', 'Civil Procedure Code and Limitation Act'),
  (6, 'CL18', 'Public International Law'),
  -- Semester VII
  (7, 'CM19', 'Advertising and Publicity Management'),
  (7, 'CL19', 'Principles of Taxation Law'),
  (7, 'CL20', 'Labour Law - II'),
  (7, 'CL21', 'Environmental Law'),
  (7, 'CL22', 'Property Law'),
  (7, 'CCL1', 'Drafting, Pleading and Conveyancing'),
  -- Semester VIII
  (8, 'GEC1', 'General Elective - 1'),
  (8, 'GEC2', 'General Elective - 2'),
  (8, 'GEC3', 'General Elective - 3'),
  (8, 'GEC4', 'General Elective - 4'),
  (8, 'CM20', 'Management Project and Viva-Voce'),
  (8, 'CCL2', 'Professional Ethics and Professional Accounting System'),
  -- Semester IX
  (9, 'GEC5', 'General Elective - 5'),
  (9, 'GEC6', 'General Elective - 6'),
  (9, 'SEC1', 'Special Elective (Business Law) - 1'),
  (9, 'SEC2', 'Special Elective (Business Law) - 2'),
  (9, 'SEC3', 'Special Elective (Business Law) - 3'),
  (9, 'CCL3', 'Alternative Dispute Resolution'),
  -- Semester X
  (10, 'SEC4', 'Special Elective (Business Law) - 4'),
  (10, 'SEC5', 'Special Elective (Business Law) - 5'),
  (10, 'SEC6', 'Special Elective (Business Law) - 6'),
  (10, 'SEC7', 'Special Elective (Business Law) - 7'),
  (10, 'SEC8', 'Special Elective (Business Law) - 8'),
  (10, 'CCL4', 'Moot Court Exercise and Internship'),
  (10, 'VV', 'Viva-Voce')
) AS v(semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'BALLB'
JOIN public.semesters sem
  ON sem.programme_id = p.id AND sem.semester_number = v.semester_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s
  WHERE s.programme_id = p.id
    AND s.semester_id = sem.id
    AND s.specialization_id IS NULL
    AND s.subject_code = v.code
);

-- ----------------------------------------------------------------------------
-- 4. Verification (run manually) - expected:
--      programme 1 row, has_specializations = false
--      semesters 10 rows
--      subjects  61 rows, 6/6/6/6/6/6/6/6/6/7 per semester
--      specializations 0
-- ----------------------------------------------------------------------------
-- SELECT pr.code, pr.total_semesters, pr.has_specializations,
--        (SELECT count(*) FROM public.semesters s WHERE s.programme_id = pr.id) AS semester_rows,
--        (SELECT count(*) FROM public.subjects  b WHERE b.programme_id = pr.id) AS subject_rows
--   FROM public.programmes pr
--  WHERE pr.code = 'BALLB';
--
-- SELECT sem.semester_number, count(*) AS papers
--   FROM public.subjects b
--   JOIN public.programmes pr ON pr.id = b.programme_id
--   JOIN public.semesters  sem ON sem.id = b.semester_id
--  WHERE pr.code = 'BALLB'
--  GROUP BY sem.semester_number
--  ORDER BY sem.semester_number;
