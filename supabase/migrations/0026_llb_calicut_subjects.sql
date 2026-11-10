-- ============================================================================
-- 0026 - University of Calicut LL.B. (3-year Unitary course) - programme,
--        semesters and the complete paper list
-- ----------------------------------------------------------------------------
-- Source: University of Calicut, "Regulations for LL.B. Unitary Degree Course
-- (3 Year) [from 2015 admission (2015-16 academic year) onwards]" - the
-- regulations, scheme of examinations and detailed syllabus published by the
-- University and reproduced by Government Law College, Kozhikode
-- (glckozhikode.ac.in/3-year-llb). The curriculum is 24 compulsory papers
-- (CP 01-CP 24), 8 optional papers (OP 01-OP 08) and 5 practical training
-- papers (PT 01-PT 05) - 37 papers in all, spread over 6 semesters. Nothing
-- here is invented: every code, title and semester is taken from that
-- published scheme.
--
-- Two deliberate notes:
--
-- 1. LL.B is a single-course degree - there are no branches - so the
--    programme is created with has_specializations = false. Since 0025 and
--    src/lib/programme-branches.ts no student is ever asked for a branch.
--
-- 2. The papers carry regulation_id = NULL on purpose. The scheme belongs to
--    University of Calicut, but adding a CU-owned row to
--    academic_regulations would make it the *only* scheme offered to every
--    other Calicut undergraduate (see applicableSchemes() in
--    src/lib/regulation-scope.ts: a university's own schemes win outright).
--    A subject with a NULL scheme is visible under every scheme the student
--    picks, which is exactly right for a paper set that has not changed.
--    When a Calicut LL.B. scheme row is wanted, it needs the scheme picker
--    to scope by programme first - a separate change.
--
-- Idempotent: safe to run more than once. Requires 0001 (schema) and the
-- seeded taxonomy. Semesters are self-healed below.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The programme
-- ----------------------------------------------------------------------------
INSERT INTO public.programmes
  (code, name, full_title, degree_level, total_semesters, has_specializations, description, display_order)
VALUES
  ('LLB', 'LL.B', 'Bachelor of Laws', 'UG', 6, false,
   'Three-year unitary law degree for graduates - a single course with no branches.',
   13)
ON CONFLICT (code) DO UPDATE
  SET has_specializations = false;

-- ----------------------------------------------------------------------------
-- 2. Six semesters
-- ----------------------------------------------------------------------------
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS t(n)
WHERE p.code = 'LLB'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Every paper
-- ----------------------------------------------------------------------------
INSERT INTO public.subjects
  (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, NULL, NULL, sem.id, v.code, v.name, 'published'
FROM (VALUES
  -- Semester I
  (1, 'CP01', 'Law of Contracts'),
  (1, 'CP02', 'Law of Torts (including Motor Vehicles Act and Consumer Protection Laws)'),
  (1, 'CP03', 'Constitutional Law I'),
  (1, 'CP04', 'Family Law I'),
  (1, 'CP05', 'Law of Crimes I'),
  (1, 'OP01', 'Legal Language and Legal Writing'),
  -- Semester II
  (2, 'CP06', 'Constitutional Law II'),
  (2, 'CP07', 'Special Contracts'),
  (2, 'CP08', 'Jurisprudence'),
  (2, 'CP09', 'Family Law II'),
  (2, 'CP10', 'Law of Crimes II (including Cyber Crimes)'),
  (2, 'OP02', 'Local Self Government (including Panchayat Administration)'),
  -- Semester III
  (3, 'CP11', 'Administrative Law'),
  (3, 'CP12', 'Labour and Industrial Laws I'),
  (3, 'CP13', 'Law of Civil Procedure I (including Civil Rules of Practice)'),
  (3, 'CP14', 'Law of Criminal Procedure I (including Probation of Offenders Act)'),
  (3, 'OP03', 'Human Rights Law and Practice'),
  (3, 'PT01', 'Professional Ethics and Professional Accounting System'),
  -- Semester IV
  (4, 'CP15', 'Environmental Law'),
  (4, 'CP16', 'Law of Civil Procedure II (including Limitation Act)'),
  (4, 'CP17', 'Property Law (including Transfer of Property Act and Easement Act)'),
  (4, 'CP18', 'Labour and Industrial Laws II'),
  (4, 'CP19', 'Law of Criminal Procedure II (including Juvenile Justice Act)'),
  (4, 'PT02', 'Drafting, Pleading and Conveyancing'),
  -- Semester V
  (5, 'CP20', 'Company Law'),
  (5, 'CP21', 'Law of Evidence'),
  (5, 'CP22', 'Law of Direct Taxation'),
  (5, 'OP04', 'Intellectual Property Rights'),
  (5, 'OP05', 'Banking Laws (including NI Act)'),
  (5, 'PT03', 'Alternate Dispute Resolution'),
  -- Semester VI
  (6, 'CP23', 'Law of Indirect Taxation'),
  (6, 'CP24', 'Public International Law'),
  (6, 'OP06', 'Land Laws (including Tenure and Tenancy System)'),
  (6, 'OP07', 'Interpretation of Statutes and Principles of Legislation'),
  (6, 'OP08', 'Gender Justice and Feminist Jurisprudence'),
  (6, 'PT04', 'Moot Court Exercise and Court Visit'),
  (6, 'PT05', 'Internship Programme')
) AS v(semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'LLB'
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
--      programmes: 1 row with has_specializations = false
--      semesters : 6 rows
--      subjects  : 37 rows (24 CP + 8 OP + 5 PT), 6/6/6/6/6/7 per semester
--    and no specializations:
-- ----------------------------------------------------------------------------
-- SELECT pr.code, pr.has_specializations, count(DISTINCT s.id) AS semesters
--   FROM public.programmes pr
--   LEFT JOIN public.semesters s ON s.programme_id = pr.id
--  WHERE pr.code = 'LLB'
--  GROUP BY pr.code, pr.has_specializations;
--
-- SELECT sem.semester_number, count(*) AS papers
--   FROM public.subjects sub
--   JOIN public.programmes pr ON pr.id = sub.programme_id
--   JOIN public.semesters sem ON sem.id = sub.semester_id
--  WHERE pr.code = 'LLB'
--  GROUP BY sem.semester_number
--  ORDER BY sem.semester_number;
--
-- SELECT count(*) FROM public.specializations sp
--   JOIN public.programmes pr ON pr.id = sp.programme_id
--  WHERE pr.code = 'LLB';   -- expected 0
