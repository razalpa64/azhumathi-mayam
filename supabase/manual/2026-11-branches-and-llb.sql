-- ============================================================================
-- PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND PRESS RUN
-- ----------------------------------------------------------------------------
-- Dashboard:  Supabase -> your project -> SQL Editor -> New query
--             -> paste everything below -> Run
--
-- This file is exactly two migrations from the repo, in order, plus a schema
-- cache reload at the end:
--   1. supabase/migrations/0025_degrees_without_branches.sql
--   2. supabase/migrations/0026_llb_calicut_subjects.sql
--
-- Why: 0026 creates the LL.B programme and its subjects. 0025 is what stops
-- BBA / BCA / MCA / LL.B from ever being asked for a branch, and cleans the
-- branches that were already stored. 0026 assumes 0025 has run, so the order
-- matters - keep them as they are below.
--
-- Safe to run more than once: everything is guarded (ON CONFLICT / NOT EXISTS).
-- Nothing is deleted: only references that cannot be honoured are cleared, and
-- dead branch rows are hidden (is_active = false), not removed.
--
-- If you have never run 0001-0024 on this project, run those first - this file
-- only assumes the normal schema and the seeded taxonomy (universities,
-- programmes, schemes, semesters, categories) already exist.
--
-- AFTER RUNNING IT: the sign-up page keeps a five-minute copy of the
-- programme list, and a SQL change is invisible to the app. Either wait five
-- minutes, or go to Admin -> Courses & Universities and press
-- "Refresh public lists" - that is exactly what the button is for.
-- ============================================================================

-- =====================================================================
-- Azhumathi Mayam — Degrees without branches (0025)
--
-- BBA, BCA, MCA … are single-course degrees: `programmes.has_specializations`
-- records that, but the flag used to be written and never read, so those
-- students were still asked for a "Branch / Specialization". Branches filed
-- under the wrong programme (BBA showing CSE, etc.) made it worse.
--
-- The app now reads the flag everywhere (src/lib/programme-branches.ts) and
-- the API refuses to store a branch for such a programme
-- (src/lib/programme-branches-server.ts). This migration cleans up what is
-- already stored and makes the database itself enforce the same rule, so the
-- bug cannot come back through a SQL editor, a script or an older build.
--
-- Safe to run more than once. Nothing is deleted: only references that can
-- never be honoured are cleared, and dead branch rows are hidden (is_active
-- = false) instead of removed — re-enable them from
-- Admin → Specializations if a programme really should have branches.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Clear stored branches that belong to a no-branch programme
-- ---------------------------------------------------------------------
UPDATE public.profiles p
   SET specialization_id = NULL
  FROM public.programmes pr
 WHERE pr.id = p.programme_id
   AND pr.has_specializations IS FALSE
   AND p.specialization_id IS NOT NULL;

UPDATE public.subjects s
   SET specialization_id = NULL
  FROM public.programmes pr
 WHERE pr.id = s.programme_id
   AND pr.has_specializations IS FALSE
   AND s.specialization_id IS NOT NULL;

UPDATE public.resources r
   SET specialization_id = NULL
  FROM public.programmes pr
 WHERE pr.id = r.programme_id
   AND pr.has_specializations IS FALSE
   AND r.specialization_id IS NOT NULL;

-- Notices targeted at a branch of a no-branch programme (column added in
-- 0023) would reach nobody.
UPDATE public.notices n
   SET target_specialization_id = NULL
  FROM public.programmes pr
 WHERE pr.id = n.target_programme_id
   AND pr.has_specializations IS FALSE
   AND n.target_specialization_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Hide stray branch rows filed under a no-branch programme that
--    nothing references. Referenced ones stay visible in the admin
--    table (flagged) so staff can re-file them under the right degree.
-- ---------------------------------------------------------------------
UPDATE public.specializations sp
   SET is_active = FALSE
  FROM public.programmes pr
 WHERE pr.id = sp.programme_id
   AND pr.has_specializations IS FALSE
   AND sp.is_active IS TRUE
   AND NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.specialization_id = sp.id)
   AND NOT EXISTS (SELECT 1 FROM public.resources r WHERE r.specialization_id = sp.id)
   AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.specialization_id = sp.id);

-- ---------------------------------------------------------------------
-- 3. Database guards
-- ---------------------------------------------------------------------

-- 3a. profiles / subjects / resources can never hold a branch for a
--     programme whose has_specializations is false (or missing).
CREATE OR REPLACE FUNCTION public.null_branch_without_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.specialization_id IS NOT NULL AND NEW.programme_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.programmes pr
       WHERE pr.id = NEW.programme_id
         AND pr.has_specializations IS TRUE
    ) THEN
      NEW.specialization_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_branch_flag_guard ON public.profiles;
CREATE TRIGGER profiles_branch_flag_guard
  BEFORE INSERT OR UPDATE OF specialization_id, programme_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.null_branch_without_flag();

DROP TRIGGER IF EXISTS subjects_branch_flag_guard ON public.subjects;
CREATE TRIGGER subjects_branch_flag_guard
  BEFORE INSERT OR UPDATE OF specialization_id, programme_id ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.null_branch_without_flag();

DROP TRIGGER IF EXISTS resources_branch_flag_guard ON public.resources;
CREATE TRIGGER resources_branch_flag_guard
  BEFORE INSERT OR UPDATE OF specialization_id, programme_id ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.null_branch_without_flag();

-- 3b. A branch cannot be created under a no-branch programme in the first
--     place — it would never be offered anywhere.
CREATE OR REPLACE FUNCTION public.reject_branch_without_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.programme_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.programmes pr
     WHERE pr.id = NEW.programme_id
       AND pr.has_specializations IS TRUE
  ) THEN
    RAISE EXCEPTION
      'That programme is marked as having no branches, so it cannot have specializations. Enable "has specializations" for it first.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS specializations_branch_flag_guard ON public.specializations;
CREATE TRIGGER specializations_branch_flag_guard
  BEFORE INSERT OR UPDATE OF programme_id ON public.specializations
  FOR EACH ROW EXECUTE FUNCTION public.reject_branch_without_flag();

-- 3c. Turning "has specializations" off for a programme clears the
--     branches that were pointing at it, so the switch behaves the way
--     staff expect instead of quietly leaving stale data behind.
CREATE OR REPLACE FUNCTION public.clear_branches_when_flag_turned_off()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
     SET specialization_id = NULL
   WHERE programme_id = NEW.id
     AND specialization_id IS NOT NULL;

  UPDATE public.subjects
     SET specialization_id = NULL
   WHERE programme_id = NEW.id
     AND specialization_id IS NOT NULL;

  UPDATE public.resources
     SET specialization_id = NULL
   WHERE programme_id = NEW.id
     AND specialization_id IS NOT NULL;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS programmes_branch_flag_cleanup ON public.programmes;
CREATE TRIGGER programmes_branch_flag_cleanup
  AFTER UPDATE OF has_specializations ON public.programmes
  FOR EACH ROW
  WHEN (NEW.has_specializations IS FALSE AND OLD.has_specializations IS DISTINCT FROM FALSE)
  EXECUTE FUNCTION public.clear_branches_when_flag_turned_off();

-- ---------------------------------------------------------------------
-- 4. Verification (run manually — expected: zero rows in both)
-- ---------------------------------------------------------------------
-- SELECT p.id, p.full_name
--   FROM public.profiles p
--   JOIN public.programmes pr ON pr.id = p.programme_id
--  WHERE pr.has_specializations IS FALSE AND p.specialization_id IS NOT NULL;
--
-- SELECT s.id, s.subject_code
--   FROM public.subjects s
--   JOIN public.programmes pr ON pr.id = s.programme_id
--  WHERE pr.has_specializations IS FALSE AND s.specialization_id IS NOT NULL;

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

-- ============================================================================
-- Reload the API schema cache so the app sees the new programme immediately
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Check it worked - expect: programme 1 row | semester 6 | subjects 37
--   LLB row => has_specializations = false
--   specializations under LLB => 0
-- ============================================================================
SELECT pr.code,
       pr.name,
       pr.total_semesters,
       pr.has_specializations,
       (SELECT count(*) FROM public.semesters s WHERE s.programme_id = pr.id) AS semester_rows,
       (SELECT count(*) FROM public.subjects  b WHERE b.programme_id = pr.id) AS subject_rows
  FROM public.programmes pr
 WHERE pr.code = 'LLB';

SELECT sem.semester_number,
       count(*) AS papers
  FROM public.subjects b
  JOIN public.programmes pr ON pr.id = b.programme_id
  JOIN public.semesters  sem ON sem.id = b.semester_id
 WHERE pr.code = 'LLB'
 GROUP BY sem.semester_number
 ORDER BY sem.semester_number;

SELECT count(*) AS llb_specializations
  FROM public.specializations sp
  JOIN public.programmes pr ON pr.id = sp.programme_id
 WHERE pr.code = 'LLB';
