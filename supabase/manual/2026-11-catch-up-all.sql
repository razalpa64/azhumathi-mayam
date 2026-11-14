-- ============================================================================
-- Catch-up: everything merged but not yet in the database - ONE paste
-- ----------------------------------------------------------------------------
-- Run the whole file in the Supabase SQL Editor (Run, not "Run selection").
-- It applies, in order:
--
--   1. BBA's three Calicut streams            (0027)
--   2. B.B.A. LL.B (Hons.), 10 semesters      (0028)
--   3. The law honours groups                 (0029)
--   4. The download recorder repair           (0030)
--
-- Every block is idempotent: running this twice changes nothing and never
-- duplicates a row. The last query is the report - read its `check` column.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1/4  BBA branches - Finance / Marketing / Human Resource Management (0027)
-- --------------------------------------------------------------------------

UPDATE public.programmes
   SET has_specializations = true
 WHERE code = 'BBA';

-- ----------------------------------------------------------------------------
-- 2. The three streams
-- ----------------------------------------------------------------------------
INSERT INTO public.specializations (programme_id, code, name, description, is_active, display_order)
SELECT p.id, v.code, v.name, v.description, true, v.display_order
FROM (VALUES
  ('FIN', 'Finance',
   'Core courses in the area of specialisation: Income Tax; Financial Markets and Institutions; Financial Services; Investment Management.',
   1),
  ('MKT', 'Marketing',
   'Core courses in the area of specialisation: Consumer Behaviour; Product and Brand Management; Advertising and Sales Promotion; Supply Chain and Logistics Management.',
   2),
  ('HRM', 'Human Resource Management',
   'Core courses in the area of specialisation: Human Resource Planning and Development; Industrial Relations; Performance Management; Management Training and Development.',
   3)
) AS v(code, name, description, display_order)
JOIN public.programmes p ON p.code = 'BBA'
WHERE NOT EXISTS (
  SELECT 1 FROM public.specializations sp
   WHERE sp.programme_id = p.id
     AND sp.code = v.code
);

-- Rows that 0025 hid (filed under a no-branch programme, unreferenced) come
-- back rather than being re-typed.
UPDATE public.specializations sp
   SET is_active = true
  FROM public.programmes p
 WHERE p.code = 'BBA'
   AND sp.programme_id = p.id
   AND sp.code IN ('FIN', 'MKT', 'HRM')
   AND sp.is_active IS FALSE;

-- ----------------------------------------------------------------------------
-- 3. Verification (run manually) - expected: BBA true | FIN, MKT, HRM active
-- ----------------------------------------------------------------------------
-- SELECT p.code, p.has_specializations, sp.code, sp.name, sp.is_active
--   FROM public.programmes p
--   LEFT JOIN public.specializations sp ON sp.programme_id = p.id
--  WHERE p.code = 'BBA'
--  ORDER BY sp.display_order;

-- --------------------------------------------------------------------------
-- 2/4  B.B.A. LL.B (Hons.), five years - 10 semesters, 61 papers (0028)
-- --------------------------------------------------------------------------

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

-- --------------------------------------------------------------------------
-- 3/4  Law honours groups - Business Law / Constitutional Law / Law and Agriculture / IPR (0029)
-- --------------------------------------------------------------------------

UPDATE public.programmes
   SET has_specializations = true
 WHERE code = 'BALLB';

-- ----------------------------------------------------------------------------
-- 2. The four groups the regulations name
-- ----------------------------------------------------------------------------
INSERT INTO public.specializations (programme_id, code, name, description, is_active, display_order)
SELECT p.id, v.code, v.name, v.description, true, v.display_order
FROM (VALUES
  ('BLW', 'Business Law',
   'The group the University offers initially. Special elective papers named in the regulations: Banking Law; Insurance Law; Law of Carriages; Foreign Trade Law; Bankruptcy and Insolvency Law; Law of Corporate Governance; Law of Merger and Acquisition; Competition Law; Information Technology Law; Law on Corporate Finance; Direct Taxation; Indirect Taxation.',
   1),
  ('CONST', 'Constitutional Law',
   'A Special Elective Group named in the regulations. The papers offered under the group are notified by the University.',
   2),
  ('AGRI', 'Law and Agriculture',
   'A Special Elective Group named in the regulations. The papers offered under the group are notified by the University.',
   3),
  ('IPR', 'Intellectual Property Law',
   'A Special Elective Group named in the regulations. The papers offered under the group are notified by the University.',
   4)
) AS v(code, name, description, display_order)
JOIN public.programmes p ON p.code = 'BALLB'
WHERE NOT EXISTS (
  SELECT 1 FROM public.specializations sp
   WHERE sp.programme_id = p.id
     AND sp.code = v.code
);

-- ----------------------------------------------------------------------------
-- 3. Rows that 0025 hid come back rather than being re-typed
-- ----------------------------------------------------------------------------
UPDATE public.specializations sp
   SET is_active = true
  FROM public.programmes p
 WHERE p.code = 'BALLB'
   AND sp.programme_id = p.id
   AND sp.code IN ('BLW', 'CONST', 'AGRI', 'IPR')
   AND sp.is_active IS FALSE;

-- ----------------------------------------------------------------------------
-- 4. Verification (run manually) - expected:
--      BALLB | true | 4 rows: BLW, CONST, AGRI, IPR, all active
--      LLB   | false | 0 rows  (untouched, on purpose)
-- ----------------------------------------------------------------------------
-- SELECT p.code AS programme, p.has_specializations,
--        count(sp.id) FILTER (WHERE sp.is_active) AS active_branches,
--        string_agg(sp.code, ' / ' ORDER BY sp.display_order) FILTER (WHERE sp.is_active) AS branches
--   FROM public.programmes p
--   LEFT JOIN public.specializations sp ON sp.programme_id = p.id
--  WHERE p.code IN ('BALLB', 'LLB')
--  GROUP BY p.code, p.has_specializations
--  ORDER BY p.code;

-- --------------------------------------------------------------------------
-- 4/4  Download telemetry repair (0030)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_resource_download(
  p_resource_id UUID,
  p_user_id UUID,
  p_dedupe_bucket TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
BEGIN
  -- A signed-in student may only record their own download. Calls made with
  -- the server's secret key have no auth context and are trusted, which is how
  -- the route invokes this.
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only record your own downloads.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.downloads (resource_id, user_id, dedupe_bucket, user_agent)
  VALUES (p_resource_id, p_user_id, p_dedupe_bucket, p_user_agent)
  ON CONFLICT (user_id, resource_id, dedupe_bucket) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    UPDATE public.resources
       SET download_count = download_count + 1
     WHERE id = p_resource_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- The route calls this with the secret key; the grant is explicit so a future
-- REVOKE from PUBLIC cannot silently break every download again.
GRANT EXECUTE ON FUNCTION public.record_resource_download(UUID, UUID, TEXT, TEXT)
  TO service_role;

-- ----------------------------------------------------------------------------
-- 2. Re-count: no resource may report fewer downloads than it has events for
-- ----------------------------------------------------------------------------
UPDATE public.resources r
   SET download_count = ledger.event_count
  FROM (
    SELECT resource_id, count(*)::INT AS event_count
      FROM public.downloads
     GROUP BY resource_id
  ) AS ledger
 WHERE ledger.resource_id = r.id
   AND r.download_count < ledger.event_count;

-- ----------------------------------------------------------------------------
-- 3. Reading the newest 25 events is the whole point of the audit panel
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_downloads_created_at
  ON public.downloads (created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Make PostgREST see the function now, not after its next restart
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- 5. Verification (run manually)
--    a) the function exists and the route may call it
-- ----------------------------------------------------------------------------
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_may_execute
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public'
--    AND p.proname = 'record_resource_download';
--
--    b) counters vs ledger — expect zero rows
-- ----------------------------------------------------------------------------
-- SELECT r.id, r.title, r.download_count, ledger.event_count
--   FROM public.resources r
--   JOIN (SELECT resource_id, count(*)::INT AS event_count
--           FROM public.downloads GROUP BY resource_id) AS ledger
--     ON ledger.resource_id = r.id
--  WHERE r.download_count <> ledger.event_count;



-- ============================================================================
-- REPORT
-- ============================================================================
select p.code as programme,
       p.has_specializations as asks_for_branch,
       (select count(*) from public.specializations sp
         where sp.programme_id = p.id and sp.is_active) as branches,
       (select count(*) from public.semesters sm where sm.programme_id = p.id) as semesters,
       (select count(*) from public.subjects s where s.programme_id = p.id) as subjects,
       case
         when p.code = 'BBA'   and p.has_specializations is true
              and (select count(*) from public.specializations sp where sp.programme_id = p.id and sp.is_active) = 3
           then 'OK'
         when p.code = 'BALLB' and p.has_specializations is true
              and (select count(*) from public.specializations sp where sp.programme_id = p.id and sp.is_active) = 4
           then 'OK'
         when p.code = 'LLB'   and p.has_specializations is not true then 'OK'
         else 'CHECK'
       end as status
  from public.programmes p
 where p.code in ('BBA', 'BALLB', 'LLB')
 order by p.code;

select
  (select count(*)
     from pg_proc pr
     join pg_namespace n on n.oid = pr.pronamespace
    where n.nspname = 'public'
      and pr.proname = 'record_resource_download') as recorder_functions,
  (select count(*) from public.downloads) as download_events,
  (select coalesce(sum(download_count), 0) from public.resources) as counter_total,
  (select count(*)
     from public.resources r
     join (select resource_id, count(*)::int as c
             from public.downloads group by resource_id) l
       on l.resource_id = r.id
    where r.download_count <> l.c) as counters_out_of_sync,
  (select max(created_at) from public.downloads) as last_event_at;
