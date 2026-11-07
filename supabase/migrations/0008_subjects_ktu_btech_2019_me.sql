-- ============================================================================
-- 0008 — Subjects: KTU B.Tech 2019 scheme, Mechanical Engineering
-- ----------------------------------------------------------------------------
-- Completes the one major 2019 branch migration 0006 could not cover at
-- the time. Source: APJ Abdul Kalam Technological University, B.Tech
-- Curriculum 2019, official Mechanical Engineering curriculum table
-- (course code + title per semester, incl. all programme-elective
-- baskets). Transcribed from the published curriculum; nothing invented.
--
-- Scope: S3-S8 core subjects, labs, comprehensive/seminar/project work
-- and programme electives for ME. University-common subjects
-- (EST200/HUT200/MCN201/MCN202/HUT300/HUT310/MCN301/MCN401) are already
-- shared rows from 0006 and are not repeated. Minor/Honours baskets and
-- open electives excluded, same rule as 0006. S1/S2 keep the shared
-- starter rows (paired-cycle subjects are college-assigned).
--
-- Idempotent: skips any code already present for the same programme +
-- semester + specialization + scheme. Requires 0001, seed, 0005, 0006.
-- ============================================================================

INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN generate_series(1, p.total_semesters) AS n
WHERE p.code = 'BTECH'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, sp.id, r.id, sem.id, v.code, v.name, 'published'
FROM (VALUES
  ('ME', 3, 'MAT201', 'Partial Differential Equation and Complex Analysis'),
  ('ME', 3, 'MET201', 'Mechanics of Solids'),
  ('ME', 3, 'MET203', 'Mechanics of Fluids'),
  ('ME', 3, 'MET205', 'Engineering Thermodynamics'),
  ('ME', 3, 'MEL201', 'Computer Aided Machine Drawing'),
  ('ME', 3, 'MEL203', 'Materials Testing Lab'),
  ('ME', 4, 'MAT202', 'Probability, Statistics and Numerical Methods'),
  ('ME', 4, 'MET202', 'Metallurgy & Material Science'),
  ('ME', 4, 'MET204', 'Manufacturing Process'),
  ('ME', 4, 'MET206', 'Fluid Machinery'),
  ('ME', 4, 'MEL202', 'FM & HM Lab'),
  ('ME', 4, 'MEL204', 'Machine Tools Lab I'),
  ('ME', 5, 'MET301', 'Mechanics of Machinery'),
  ('ME', 5, 'MET303', 'Thermal Engineering'),
  ('ME', 5, 'MET305', 'Industrial & Systems Engineering'),
  ('ME', 5, 'MET307', 'Machine Tools and Metrology'),
  ('ME', 5, 'MEL331', 'Machine Tools Lab II'),
  ('ME', 5, 'MEL333', 'Thermal Engineering Lab I'),
  ('ME', 6, 'MET302', 'Heat & Mass Transfer'),
  ('ME', 6, 'MET304', 'Dynamics of Machinery & Machine Design'),
  ('ME', 6, 'MET306', 'Advanced Manufacturing Engineering'),
  ('ME', 6, 'MET312', 'Nondestructive Testing'),
  ('ME', 6, 'MET322', 'Data Analytics for Engineers'),
  ('ME', 6, 'MET332', 'Advanced Mechanics of Solids'),
  ('ME', 6, 'MET342', 'IC Engines, Combustion and Pollution'),
  ('ME', 6, 'MET352', 'Automobile Engineering'),
  ('ME', 6, 'MET362', 'Product Design and Development'),
  ('ME', 6, 'MET372', 'Advanced Metal Joining Techniques'),
  ('ME', 6, 'MET308', 'Comprehensive Course Work'),
  ('ME', 6, 'MEL332', 'Computer Aided Design & Analysis Lab'),
  ('ME', 6, 'MEL334', 'Thermal Engineering Lab II'),
  ('ME', 7, 'MET401', 'Design of Machine Elements'),
  ('ME', 7, 'MET413', 'Advanced Methods in Nondestructive Testing'),
  ('ME', 7, 'MET423', 'Applications of Optimization Techniques'),
  ('ME', 7, 'MET433', 'Finite Element Method'),
  ('ME', 7, 'MET443', 'Aerospace Engineering'),
  ('ME', 7, 'MET453', 'Hybrid and Electric Vehicles'),
  ('ME', 7, 'MET463', 'Operations Management'),
  ('ME', 7, 'MET473', 'Air Conditioning and Refrigeration'),
  ('ME', 7, 'MEL411', 'Mechanical Engineering Lab'),
  ('ME', 7, 'MEQ413', 'Seminar'),
  ('ME', 7, 'MED415', 'Project Phase I'),
  ('ME', 8, 'MET402', 'Mechatronics'),
  ('ME', 8, 'MET404', 'Comprehensive Viva Voce'),
  ('ME', 8, 'MED416', 'Project Phase II'),
  ('ME', 8, 'MET414', 'Supply Chain Management'),
  ('ME', 8, 'MET424', 'Decisions with Metaheuristics'),
  ('ME', 8, 'MET434', 'Pressure Vessel and Piping Design'),
  ('ME', 8, 'MET444', 'Computational Fluid Dynamics'),
  ('ME', 8, 'MET454', 'Industrial Tribology'),
  ('ME', 8, 'MET464', 'Technology Management'),
  ('ME', 8, 'MET474', 'Heating and Ventilation System'),
  ('ME', 8, 'MET416', 'Composite Materials'),
  ('ME', 8, 'MET426', 'Machine Learning and Applications'),
  ('ME', 8, 'MET436', 'Acoustics and Noise Control'),
  ('ME', 8, 'MET446', 'Heat Transfer Equipment Design'),
  ('ME', 8, 'MET456', 'Robotics and Automation'),
  ('ME', 8, 'MET466', 'Micro and Nano Manufacturing'),
  ('ME', 8, 'MET476', 'Cryogenic Engineering'),
  ('ME', 8, 'MET418', 'Quality and Reliability Engineering'),
  ('ME', 8, 'MET428', 'Industrial Internet of Things'),
  ('ME', 8, 'MET438', 'Fracture Mechanics'),
  ('ME', 8, 'MET448', 'Gas Turbines and Jet Propulsion'),
  ('ME', 8, 'MET458', 'Advanced Energy Engineering'),
  ('ME', 8, 'MET468', 'Additive Manufacturing'),
  ('ME', 8, 'MET478', 'Power Plant Engineering')
) AS v(spec_code, semester_number, code, name)
JOIN public.universities u ON u.short_name = 'KTU'
JOIN public.programmes p ON p.code = 'BTECH'
LEFT JOIN public.specializations sp
  ON sp.programme_id = p.id AND sp.code = v.spec_code
JOIN public.academic_regulations r ON r.code = 'KTU-2019'
JOIN public.semesters sem
  ON sem.programme_id = p.id AND sem.semester_number = v.semester_number
WHERE (v.spec_code = '' OR sp.id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.programme_id = p.id
      AND s.semester_id = sem.id
      AND s.specialization_id IS NOT DISTINCT FROM sp.id
      AND s.regulation_id = r.id
      AND s.subject_code = v.code
  );
