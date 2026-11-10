-- ============================================================================
-- BBA branches - apply and check, in ONE paste
-- ----------------------------------------------------------------------------
-- Run the whole file in the Supabase SQL Editor (Run, not "Run selection").
-- It ends with a single result row whose `status` column tells you the truth:
--
--   OK          -> sign-up will now ask BBA students for a branch
--   NO FLAG     -> the programme update did not stick (check for an error above)
--   NO BRANCHES -> the flag is on but the three rows are missing
--   WRONG COUNT -> something else is filed under BBA; look at `branches`
--
-- Safe to run twice: it never duplicates a row.
-- ============================================================================

-- 1. BBA has branches (must be first: the 0025 guard refuses a branch on a
--    programme that is marked as having none)
update public.programmes
   set has_specializations = true
 where code = 'BBA';

-- 2. The three University of Calicut streams
insert into public.specializations (programme_id, code, name, description, is_active, display_order)
select p.id, v.code, v.name, v.description, true, v.display_order
  from (values
        ('FIN', 'Finance',
         'Core courses: Income Tax; Financial Markets and Institutions; Financial Services; Investment Management.', 1),
        ('MKT', 'Marketing',
         'Core courses: Consumer Behaviour; Product and Brand Management; Advertising and Sales Promotion; Supply Chain and Logistics Management.', 2),
        ('HRM', 'Human Resource Management',
         'Core courses: Human Resource Planning and Development; Industrial Relations; Performance Management; Management Training and Development.', 3)
       ) as v(code, name, description, display_order)
  join public.programmes p on p.code = 'BBA'
 where not exists (
        select 1 from public.specializations sp
         where sp.programme_id = p.id and sp.code = v.code
       );

-- 3. Re-enable anything 0025 hid, instead of re-typing it
update public.specializations sp
   set is_active = true
  from public.programmes p
 where p.code = 'BBA'
   and sp.programme_id = p.id
   and sp.code in ('FIN', 'MKT', 'HRM')
   and sp.is_active is false;

-- 4. The answer
select p.code as programme,
       p.has_specializations,
       count(sp.id) filter (where sp.is_active) as active_branches,
       coalesce(
         string_agg(sp.code, ' / ' order by sp.display_order) filter (where sp.is_active),
         '(none)'
       ) as branches,
       case
         when p.has_specializations is not true then 'NO FLAG - step 1 did not stick'
         when count(sp.id) filter (where sp.is_active) = 0 then 'NO BRANCHES - step 2 did not stick'
         when count(sp.id) filter (where sp.is_active) <> 3 then 'WRONG COUNT - see branches'
         else 'OK - sign-up will now ask BBA students for a branch'
       end as status
  from public.programmes p
  left join public.specializations sp on sp.programme_id = p.id
 where p.code = 'BBA'
 group by p.code, p.has_specializations;
