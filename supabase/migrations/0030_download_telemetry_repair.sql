-- ============================================================================
-- 0030 - Download telemetry: make the recorder callable, and re-count the
--        ledger so the analytics page cannot disagree with itself
-- ----------------------------------------------------------------------------
-- Symptom: admin → Analytics showed "No student downloads recorded yet" and
-- "Verified Downloads" stopped moving, while students kept using the Download
-- button. Two independent faults produce exactly that picture, and this
-- migration closes both from the database side:
--
--   1. `record_resource_download()` exists only in 0001. If it was never
--      applied, was dropped, lost EXECUTE, or PostgREST's schema cache no
--      longer holds it, every call fails with "Could not find the function
--      public.record_resource_download(...) in the schema cache". The route
--      used to throw that error away, so nothing was logged and nothing was
--      counted. It now logs and falls back; this file makes the primary path
--      work again.
--
--   2. `resources.download_count` can drift from the `downloads` ledger — it
--      is a denormalised counter, and any failure between the insert and the
--      update leaves it short. The repair below raises any counter that is
--      below the number of events on file. It never lowers one, so a project
--      that imported historical totals keeps them.
--
-- Safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The recorder, exactly as the route calls it, in one atomic statement
-- ----------------------------------------------------------------------------
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
