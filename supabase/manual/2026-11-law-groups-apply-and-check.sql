-- ============================================================================
-- Law honours groups (0029) - apply and check, in ONE paste
-- ----------------------------------------------------------------------------
-- Run the whole file in the Supabase SQL Editor (Run, not "Run selection").
-- The last query returns one row per law programme:
--
--   BALLB | t | 4 | BLW / CONST / AGRI / IPR | OK - sign-up offers the four
--                                                honours groups
--   LLB   | f | 0 | (none)                   | OK - a three-year LL.B has no
--                                                elective groups, by design
--
-- Safe to run twice: it never duplicates a row.
-- ============================================================================

-- 1. The five-year integrated degree has a group to ask about
--    (first, because the 0025 guard refuses a branch on a no-branch programme)
update public.programmes
   set has_specializations = true
 where code = 'BALLB';

-- 2. The four groups named in clause 16 of the regulations
insert into public.specializations (programme_id, code, name, description, is_active, display_order)
select p.id, v.code, v.name, v.description, true, v.display_order
  from (values
        ('BLW', 'Business Law',
         'The group the University offers initially. Special elective papers named in the regulations: Banking Law; Insurance Law; Law of Carriages; Foreign Trade Law; Bankruptcy and Insolvency Law; Law of Corporate Governance; Law of Merger and Acquisition; Competition Law; Information Technology Law; Law on Corporate Finance; Direct Taxation; Indirect Taxation.', 1),
        ('CONST', 'Constitutional Law',
         'A Special Elective Group named in the regulations. The papers offered under the group are notified by the University.', 2),
        ('AGRI', 'Law and Agriculture',
         'A Special Elective Group named in the regulations. The papers offered under the group are notified by the University.', 3),
        ('IPR', 'Intellectual Property Law',
         'A Special Elective Group named in the regulations. The papers offered under the group are notified by the University.', 4)
       ) as v(code, name, description, display_order)
  join public.programmes p on p.code = 'BALLB'
 where not exists (
        select 1 from public.specializations sp
         where sp.programme_id = p.id and sp.code = v.code
       );

-- 3. Re-enable anything 0025 hid
update public.specializations sp
   set is_active = true
  from public.programmes p
 where p.code = 'BALLB'
   and sp.programme_id = p.id
   and sp.code in ('BLW', 'CONST', 'AGRI', 'IPR')
   and sp.is_active is false;

-- 4. The answer - both law programmes in one table
select p.code as programme,
       p.has_specializations,
       count(sp.id) filter (where sp.is_active) as active_branches,
       coalesce(string_agg(sp.code, ' / ' order by sp.display_order) filter (where sp.is_active), '(none)') as branches,
       case
         when p.code = 'BALLB' and p.has_specializations is true and count(sp.id) filter (where sp.is_active) = 4
           then 'OK - sign-up offers the four honours groups'
         when p.code = 'LLB' and p.has_specializations is not true and count(sp.id) = 0
           then 'OK - a three-year LL.B has no elective groups, by design'
         else 'CHECK - see branches column'
       end as status
  from public.programmes p
  left join public.specializations sp on sp.programme_id = p.id
 where p.code in ('BALLB', 'LLB')
 group by p.code, p.has_specializations
 order by p.code;
