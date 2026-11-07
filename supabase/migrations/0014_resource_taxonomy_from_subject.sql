-- 0014: A resource's taxonomy comes from its course, full stop.
--
-- 0013 aligned the branch tag (specialization_id) with the course.
-- The same class of mismatch can live in the resource's other stored
-- taxonomy columns: if programme_id / semester_id / regulation_id /
-- university_id were saved from an upload form independently of the
-- chosen subject, semester feeds and scheme filters file the material
-- under the wrong cohort even when its subject is right.
--
-- A subject row already carries the authoritative programme, semester,
-- scheme and university for its course, so copy them across and
-- re-apply 0013's branch rule (multi-branch course = shared NULL,
-- single-branch course = that branch). Idempotent: safe to re-run,
-- and running it without 0013 still heals the branch tag.

WITH subjects_course AS (
  SELECT
    s.id AS subject_id,
    s.programme_id,
    s.semester_id,
    s.regulation_id,
    s.university_id,
    CASE
      WHEN COUNT(*) OVER (
        PARTITION BY s.programme_id, s.semester_id, s.subject_code, s.regulation_id
      ) > 1 THEN NULL
      ELSE s.specialization_id
    END AS audience_specialization_id
  FROM subjects s
)
UPDATE resources r
SET programme_id = sc.programme_id,
    semester_id = sc.semester_id,
    regulation_id = sc.regulation_id,
    university_id = sc.university_id,
    specialization_id = sc.audience_specialization_id
FROM subjects_course sc
WHERE r.subject_id = sc.subject_id
  AND (
    r.programme_id IS DISTINCT FROM sc.programme_id
    OR r.semester_id IS DISTINCT FROM sc.semester_id
    OR r.regulation_id IS DISTINCT FROM sc.regulation_id
    OR r.university_id IS DISTINCT FROM sc.university_id
    OR r.specialization_id IS DISTINCT FROM sc.audience_specialization_id
  );
