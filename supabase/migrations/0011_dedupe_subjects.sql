-- ============================================================================
-- 0011 - Subjects: collapse programme-wide duplicate subject copies
-- ----------------------------------------------------------------------------
-- Problem (reported from the live app): subject lists showed the same
-- course again and again - e.g. 'PBCST304 - Object Oriented
-- Programming' three times in one dropdown - because migrations
-- 0006-0008 transcribed every branch's curriculum table row by row, so
-- a course shared by several branches was stored once per branch.
--
-- Two-part remedy (this migration is the data part; the display part
-- ships in app code, which now also scopes subject lists by scheme and
-- shows each course code once per list):
--
--   1. Courses that EVERY branch of a programme takes in a semester
--      under one scheme - in practice KTU's university-common courses
--      (UCEST105, UCHUT128, UCHUM506, ...) - are stored once as a
--      shared subject (specialization_id = NULL). That is exactly how
--      the app treats shared subjects everywhere: every branch's
--      subject list includes NULL-specialization rows, so each branch
--      keeps seeing the course in its own semester, unchanged, and any
--      branch can now find notes uploaded for it. Materials uploaded
--      against a removed copy are re-pointed to the surviving row
--      first (resources.subject_id is the only reference to subjects).
--
--   2. Courses shared by only SOME branches (e.g. PCCDL308 in the
--      three computing branches, GAMAT301 in the five information-
--      science branches) are NOT merged: making them programme-wide
--      would show them to branches that never take them (a Mechanical
--      student would suddenly see a CS lab). Those rows stay attached
--      to their branches; the app lists each code once per dropdown,
--      preferring the student's own branch copy.
--
-- Also deliberately NOT merged (verified against the official KTU
-- 2024 curriculum tables - same code does not always mean same course):
--   * Branch-variant titles under one code: GYMAT101/201/301
--     ('Mathematics for Electrical Science' vs '...Physical Science'),
--     GXCYT122 ('Chemistry for Electrical/Information Science'),
--     PCCST602 ('Advanced Computing Systems' in CSE vs 'Design and
--     Analysis of Algorithms' in CSE-AI&DS).
--   * Electives titled with the '(Level 5)' marker in some branches
--     (PEADT746, PECST741, ...). Level-5 courses carry extra credits
--     under the 2024 regulations, so the marker stays.
--
-- Title spellings unified (same course, printed two ways in two
-- branch tables; canonical form verified):
--   * MAT204 (KTU-2019): 'Probability, Random Process and Numerical
--     Methods' -> 'Probability, Random Processes and Numerical
--     Methods' (KTU's own MAT204 syllabus document).
--   * PCCDL308 (KTU-2024): 'Python and Statistical Modeling Lab' ->
--     'Python and Statistical Modelling Lab'.
--   * PEADT636 (KTU-2024): 'Introduction to Web Mining' -> 'Web
--     Mining' (official KTU B.Tech Curriculum 2024 elective list).
--   * PEADT862 (KTU-2024): 'Bio Inspired Optimization Techniques' ->
--     'Bio-inspired Optimization Techniques'.
-- (These four stay per-branch where they are subset courses - only
-- the spelling is made consistent.)
--
-- Idempotent: after one run no eligible groups remain; re-running
-- changes nothing. Requires subjects to exist (seed + 0006-0010).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Canonical titles for the four verified spelling variants
-- ---------------------------------------------------------------------------
UPDATE public.subjects s
SET name = 'Probability, Random Processes and Numerical Methods'
FROM public.academic_regulations r
WHERE s.regulation_id = r.id
  AND r.code = 'KTU-2019'
  AND s.subject_code = 'MAT204'
  AND s.name = 'Probability, Random Process and Numerical Methods';

UPDATE public.subjects s
SET name = 'Python and Statistical Modelling Lab'
FROM public.academic_regulations r
WHERE s.regulation_id = r.id
  AND r.code = 'KTU-2024'
  AND s.subject_code = 'PCCDL308'
  AND s.name = 'Python and Statistical Modeling Lab';

UPDATE public.subjects s
SET name = 'Web Mining'
FROM public.academic_regulations r
WHERE s.regulation_id = r.id
  AND r.code = 'KTU-2024'
  AND s.subject_code = 'PEADT636'
  AND s.name = 'Introduction to Web Mining';

UPDATE public.subjects s
SET name = 'Bio-inspired Optimization Techniques'
FROM public.academic_regulations r
WHERE s.regulation_id = r.id
  AND r.code = 'KTU-2024'
  AND s.subject_code = 'PEADT862'
  AND s.name = 'Bio Inspired Optimization Techniques';

-- ---------------------------------------------------------------------------
-- 2. Find the programme-wide groups that may safely become one row.
--    A group is eligible when every specialization that has any
--    subject in that programme+semester+scheme has a copy of the
--    course - or when a shared (NULL specialization) row already
--    exists, which makes any branch copies exact duplicates.
--    Survivor: published first, then an already-shared row, then the
--    earliest created - deterministic on every run.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _subject_merge_map;
DROP TABLE IF EXISTS _subject_merge_groups;

CREATE TEMP TABLE _subject_merge_groups AS
WITH universe AS (
  SELECT programme_id, semester_id, regulation_id,
         COUNT(DISTINCT specialization_id) AS n_specs
  FROM public.subjects
  WHERE specialization_id IS NOT NULL
  GROUP BY programme_id, semester_id, regulation_id
),
groups AS (
  SELECT university_id, programme_id, semester_id, regulation_id,
         subject_code, name, publication_status,
         COUNT(*) AS n_rows,
         COUNT(DISTINCT specialization_id) AS n_specs,
         COUNT(*) FILTER (WHERE specialization_id IS NULL) AS n_shared,
         (ARRAY_AGG(id ORDER BY
            (publication_status = 'published') DESC,
            (specialization_id IS NULL) DESC,
            created_at, id))[1] AS keeper_id,
         (ARRAY_AGG(description ORDER BY
            (description IS NULL), created_at, id))[1] AS any_description
  FROM public.subjects
  GROUP BY university_id, programme_id, semester_id, regulation_id,
           subject_code, name, publication_status
  HAVING COUNT(*) > 1
)
SELECT g.*
FROM groups g
JOIN universe u
  ON u.programme_id = g.programme_id
 AND u.semester_id = g.semester_id
 AND u.regulation_id IS NOT DISTINCT FROM g.regulation_id
WHERE g.n_shared > 0
   OR g.n_specs = u.n_specs;

CREATE TEMP TABLE _subject_merge_map AS
SELECT d.id AS dup_id, g.keeper_id
FROM public.subjects d
JOIN _subject_merge_groups g
  ON g.programme_id = d.programme_id
 AND g.semester_id = d.semester_id
 AND g.subject_code = d.subject_code
 AND g.name = d.name
 AND g.publication_status = d.publication_status
 AND g.university_id IS NOT DISTINCT FROM d.university_id
 AND g.regulation_id IS NOT DISTINCT FROM d.regulation_id
WHERE d.id <> g.keeper_id;

-- ---------------------------------------------------------------------------
-- 3. Re-point study materials from duplicate copies to the survivor
-- ---------------------------------------------------------------------------
UPDATE public.resources r
SET subject_id = m.keeper_id
FROM _subject_merge_map m
WHERE r.subject_id = m.dup_id;

-- ---------------------------------------------------------------------------
-- 4. The survivor becomes the shared course for every branch
-- ---------------------------------------------------------------------------
UPDATE public.subjects s
SET specialization_id = NULL,
    description = COALESCE(s.description, g.any_description)
FROM _subject_merge_groups g
WHERE s.id = g.keeper_id;

-- ---------------------------------------------------------------------------
-- 5. Remove the duplicate copies
-- ---------------------------------------------------------------------------
DELETE FROM public.subjects s
USING _subject_merge_map m
WHERE s.id = m.dup_id;

DROP TABLE IF EXISTS _subject_merge_map;
DROP TABLE IF EXISTS _subject_merge_groups;
