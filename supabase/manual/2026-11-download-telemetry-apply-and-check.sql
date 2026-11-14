-- ============================================================================
-- Download telemetry (0030) - apply and check, in ONE paste
-- ----------------------------------------------------------------------------
-- Run the whole file in the Supabase SQL Editor (Run, not "Run selection").
-- It repairs the recorder and re-counts the ledger, then prints one row:
--
--   recorder_functions | download_events | counter_total | counters_out_of_sync
--   1                  | 12              | 12            | 0
--
-- What the numbers mean:
--   recorder_functions   1 = record_resource_download() is present and callable
--   download_events      rows in the download ledger (the audit list reads these)
--   counter_total        sum of resources.download_count (the "Verified Downloads" tile)
--   counters_out_of_sync 0 = every counter matches its ledger rows
--
-- If download_events keeps growing while counter_total does not, the writes are
-- being refused for permission reasons - check SUPABASE_SECRET_KEY in the
-- deployment environment is a secret key, not a publishable one.
--
-- Safe to run more than once.
-- ============================================================================

create or replace function public.record_resource_download(
  p_resource_id uuid,
  p_user_id uuid,
  p_dedupe_bucket text,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_id uuid;
begin
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'You can only record your own downloads.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.downloads (resource_id, user_id, dedupe_bucket, user_agent)
  values (p_resource_id, p_user_id, p_dedupe_bucket, p_user_agent)
  on conflict (user_id, resource_id, dedupe_bucket) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is not null then
    update public.resources
       set download_count = download_count + 1
     where id = p_resource_id;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.record_resource_download(uuid, uuid, text, text)
  to service_role;

-- Raise any counter that fell below the number of events on file. Never lowers
-- one, so imported totals survive.
update public.resources r
   set download_count = ledger.event_count
  from (
    select resource_id, count(*)::int as event_count
      from public.downloads
     group by resource_id
  ) as ledger
 where ledger.resource_id = r.id
   and r.download_count < ledger.event_count;

create index if not exists idx_downloads_created_at
  on public.downloads (created_at desc);

notify pgrst, 'reload schema';

-- The answer
select
  (select count(*)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_resource_download') as recorder_functions,
  (select count(*) from public.downloads) as download_events,
  (select coalesce(sum(download_count), 0) from public.resources) as counter_total,
  (select count(*)
     from public.resources r
     join (select resource_id, count(*)::int as c
             from public.downloads group by resource_id) l
       on l.resource_id = r.id
    where r.download_count <> l.c) as counters_out_of_sync,
  (select max(created_at) from public.downloads) as last_event_at;
