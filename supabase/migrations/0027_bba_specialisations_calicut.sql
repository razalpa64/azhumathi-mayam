-- ============================================================================
-- 0027 - BBA at University of Calicut: the three specialisation streams
-- ----------------------------------------------------------------------------
-- BBA was seeded as a single-course degree (has_specializations = false, no
-- branch rows), which is why no branch was ever offered for it. The University
-- of Calicut BBA scheme under CBCSS-UG 2019 does in fact run three areas of
-- specialisation, each with four core courses in semesters V and VI:
--
--   A. Finance                  - Income Tax; Financial Markets and
--                                 Institutions; Financial Services;
--                                 Investment Management
--   B. Marketing                - Consumer Behaviour; Product and Brand
--                                 Management; Advertising and Sales Promotion;
--                                 Supply Chain and Logistics Management
--   C. Human Resource Management - Human Resource Planning and Development;
--                                 Industrial Relations; Performance Management;
--                                 Management Training and Development
--
-- Source: University of Calicut, "Regulations, Scheme and Syllabus for BBA
-- under CBCSS UG Regulations 2019" - U.O.No. 17160/2019/Admn dated 07.12.2019,
-- reissued with outcome-based education from 2020 admissions vide U.O.No.
-- 5339/2021/Admn dated 17.05.2021, and the School of Distance Education BBA
-- syllabus of the same scheme. Nothing invented.
--
-- Order matters: the flag is switched on FIRST, because the guard trigger from
-- 0025 refuses a branch on a programme marked as having none.
--
-- The 64 BBA subjects already in the database (0015) are programme-level
-- (specialization NULL), so a student who picks a stream still sees all of
-- them - this adds the picker, it never empties a library.
--
-- Idempotent: safe to run more than once. Existing rows are left alone; rows
-- hidden by 0025 are switched back on rather than duplicated.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BBA has branches after all
-- ----------------------------------------------------------------------------
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
