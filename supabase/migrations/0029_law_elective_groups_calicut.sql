-- ============================================================================
-- 0029 - University of Calicut, five-year integrated law: the Special Elective
--        Groups, as branches
-- ----------------------------------------------------------------------------
-- Source: University of Calicut, "Regulations for the Five Year Integrated
-- Double Degree B.B.A., LL.B. (Honours) Course (From the academic year
-- 2011-2012 onwards)", clause 16 (Board of Studies, 02.06.2011, under the Bar
-- Council of India Rules of Legal Education 2008):
--
--   "The other eight elective courses shall be chosen either wholly from a
--    particular group or from various groups shown as Special Elective Groups
--    viz., Constitutional Law, Business Law, Law and Agriculture, Intellectual
--    Property Law and such other groups introduced by the University/Bar
--    Council from time to time ... if the Special Elective Courses are chosen
--    entirely from one special group the student shall be awarded an Honours
--    degree specifically mentioning the group ... Considering the limitations
--    of infrastructure, availability of Faculty, and the nature of the basic
--    degree being integrated; business law group shall be the special elective
--    group to be offered initially, in the Law colleges under the University
--    at present."
--
-- So there are exactly four groups named by the University, and a student may
-- also spread the eight papers across groups. That is what is seeded below -
-- nothing else, and no papers invented for the three groups the regulations
-- name without listing their papers.
--
-- NOTE ON SCOPE - the three-year LL.B is deliberately untouched.
-- Its scheme (0026) has no elective groups at all: it names eight individual
-- optional papers, OP01-OP08 (Legal Language and Legal Writing; Local Self
-- Government; Human Rights Law and Practice; Intellectual Property Rights;
-- Banking Laws; Land Laws; Interpretation of Statutes; Gender Justice and
-- Feminist Jurisprudence), which are already seeded as subjects of their own
-- semesters. Filing those as branches would invent a structure the University
-- does not have, and would hide them from the semester where they belong.
--
-- Picking a group here is optional at sign-up (the branch field stores NULL),
-- which matches the regulations: the choice is made for the elective papers,
-- not on admission.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The programme now has an area of specialisation to ask about
--    (first, because 0025's guard refuses a branch on a no-branch programme)
-- ----------------------------------------------------------------------------
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
