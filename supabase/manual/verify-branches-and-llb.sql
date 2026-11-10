-- ============================================================================
-- ONE QUERY THAT PROVES EVERYTHING - Supabase -> SQL Editor -> New query
-- ----------------------------------------------------------------------------
-- The Supabase editor shows only the LAST result of a multi-statement run,
-- which is why running the paste file only showed you "llb_specializations 0".
-- This single statement returns every check as one small table:
-- compare the "actual" column with "expected" - every row must match.
-- Read-only: it writes nothing.
-- ============================================================================
WITH llb AS (
  SELECT * FROM public.programmes WHERE code = 'LLB'
)
SELECT 'LL.B programme exists' AS what, '1' AS expected, count(*)::text AS actual
  FROM llb
UNION ALL
SELECT 'LL.B has no branches', 'false', coalesce(bool_or(has_specializations)::text, 'missing')
  FROM llb
UNION ALL
SELECT 'LL.B semester rows', '6', count(*)::text
  FROM public.semesters s JOIN llb ON llb.id = s.programme_id
UNION ALL
SELECT 'LL.B paper rows', '37', count(*)::text
  FROM public.subjects b JOIN llb ON llb.id = b.programme_id
UNION ALL
SELECT 'LL.B papers - semester ' || n::text, CASE WHEN n = 6 THEN '7' ELSE '6' END,
       coalesce((
         SELECT count(*)::text
           FROM public.subjects b
           JOIN llb ON llb.id = b.programme_id
           JOIN public.semesters s ON s.id = b.semester_id
          WHERE s.semester_number = n
       ), '0')
  FROM generate_series(1, 6) AS n
UNION ALL
SELECT 'branches saved on no-branch degrees', '0', count(*)::text
  FROM public.profiles p
  JOIN public.programmes pr ON pr.id = p.programme_id
 WHERE pr.has_specializations IS FALSE
   AND p.specialization_id IS NOT NULL
UNION ALL
SELECT 'subjects filed on a branch for a no-branch degree', '0', count(*)::text
  FROM public.subjects b
  JOIN public.programmes pr ON pr.id = b.programme_id
 WHERE pr.has_specializations IS FALSE
   AND b.specialization_id IS NOT NULL
UNION ALL
SELECT 'database guards installed', '5', count(*)::text
  FROM pg_trigger
 WHERE tgname IN (
   'profiles_branch_flag_guard',
   'subjects_branch_flag_guard',
   'resources_branch_flag_guard',
   'specializations_branch_flag_guard',
   'programmes_branch_flag_cleanup'
 )
ORDER BY what;
