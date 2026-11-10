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
