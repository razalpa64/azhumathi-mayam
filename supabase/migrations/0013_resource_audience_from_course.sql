-- ============================================================================
-- 0013 - Resources: align each material's branch with its course
-- ----------------------------------------------------------------------------
-- A course shared by several branches is stored once per branch (e.g.
-- GAMAT301 for the five computing branches). Uploads historically saved
-- TWO separate audience markers that could contradict each other:
--   * resources.subject_id        — the branch copy picked in the form
--   * resources.specialization_id — the branch picked in the form
-- When they disagreed (notes uploaded "for CSE" on a course five
-- branches take), students of the other branches could not see the
-- material in their semester feeds or materials list, and subject
-- cards counted 0 files (the app-side counting/filtering was aligned
-- to course groups separately).
--
-- Rule from now on (enforced at upload/edit time in the API): the
-- COURSE decides the audience. If the course has copies in several
-- branches, the material is shared (specialization_id = NULL); if it
-- belongs to exactly one branch, the material carries that branch.
-- This migration applies the same rule retroactively to existing rows
-- so older uploads heal without being re-uploaded.
--
-- Idempotent: after one run every row already matches the rule.
-- ============================================================================

WITH audience AS (
  SELECT
    s.id AS subject_id,
    CASE
      WHEN COUNT(*) OVER (
        PARTITION BY s.programme_id, s.semester_id, s.subject_code, s.regulation_id
      ) > 1 THEN NULL
      ELSE s.specialization_id
    END AS audience_spec
  FROM public.subjects s
)
UPDATE public.resources r
SET specialization_id = a.audience_spec
FROM audience a
WHERE a.subject_id = r.subject_id
  AND r.specialization_id IS DISTINCT FROM a.audience_spec;
