-- ============================================================================
-- 0005 — Complete the programme taxonomy (specializations)
-- ----------------------------------------------------------------------------
-- Researched from the published programme lists of KTU, University of
-- Kerala, Mahatma Gandhi University and University of Calicut.
--
-- What this does (additions only — no existing row is renamed, recoded,
-- reordered or deleted, so saved profiles, subjects and resources are
-- untouched):
--   1. Adds the missing M.Sc programme (4 semesters, with its subjects menu)
--   2. Gives MA its subjects — the programme was flagged
--      has_specializations=true but had zero rows to choose from
--   3. Gives M.Com its real streams and flags it as specialized
--   4. Completes the specialization lists for B.Tech (the full KTU branch
--      list incl. the CSE-family and new-age branches), B.Com, B.Sc, BA,
--      MBA and M.Tech
--
-- The INSERT below carries the complete list per programme — original
-- rows included verbatim — so a database that somehow missed a base row
-- heals itself. Idempotent: safe to run more than once.
-- Apply via `npm run db:provision` or by pasting this file into the
-- Supabase SQL editor (run 0001–0004 first if the database is behind).
-- ============================================================================

-- 1. M.Com does have streams — let students pick one
UPDATE public.programmes
SET has_specializations = true
WHERE code = 'MCOM';

-- 2. The missing PG programme: M.Sc
INSERT INTO public.programmes (code, name, full_title, degree_level, total_semesters, has_specializations, description, display_order)
VALUES ('MSC', 'M.Sc', 'Master of Science', 'PG', 4, true, 'Postgraduate pure and applied sciences programme.', 12)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN generate_series(1, p.total_semesters) AS n
WHERE p.code = 'MSC'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

-- 3. All 182 specializations (complete researched lists)
INSERT INTO public.specializations (programme_id, code, name, display_order)
SELECT p.id, v.code, v.name, v.display_order
FROM (VALUES
  ('BTECH', 'CSE', 'Computer Science and Engineering', 1),
  ('BTECH', 'AIML', 'Artificial Intelligence and Machine Learning', 2),
  ('BTECH', 'IT', 'Information Technology', 3),
  ('BTECH', 'ECE', 'Electronics and Communication Engineering', 4),
  ('BTECH', 'EEE', 'Electrical and Electronics Engineering', 5),
  ('BTECH', 'ME', 'Mechanical Engineering', 6),
  ('BTECH', 'CE', 'Civil Engineering', 7),
  ('BTECH', 'AIDS', 'Artificial Intelligence and Data Science', 8),
  ('BTECH', 'CSEAI', 'Computer Science and Engineering (Artificial Intelligence)', 9),
  ('BTECH', 'CSEAIML', 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)', 10),
  ('BTECH', 'CSEAIDS', 'Computer Science and Engineering (Artificial Intelligence and Data Science)', 11),
  ('BTECH', 'CSEDS', 'Computer Science and Engineering (Data Science)', 12),
  ('BTECH', 'CYBER', 'Computer Science and Engineering (Cyber Security)', 13),
  ('BTECH', 'CSBS', 'Computer Science and Business Systems', 14),
  ('BTECH', 'IOT', 'Internet of Things and Cyber Security Including Blockchain Technology', 15),
  ('BTECH', 'RA', 'Robotics and Automation', 16),
  ('BTECH', 'ELC', 'Electrical and Computer Engineering', 17),
  ('BTECH', 'ENC', 'Electronics and Computer Engineering', 18),
  ('BTECH', 'VLSD', 'Electronics Engineering (VLSI Design and Technology)', 19),
  ('BTECH', 'EBM', 'Electronics and Biomedical Engineering', 20),
  ('BTECH', 'BM', 'Biomedical Engineering', 21),
  ('BTECH', 'BMR', 'Biomedical and Robotics Engineering', 22),
  ('BTECH', 'AERO', 'Aeronautical Engineering', 23),
  ('BTECH', 'AGRI', 'Agriculture Engineering', 24),
  ('BTECH', 'AEI', 'Applied Electronics and Instrumentation Engineering', 25),
  ('BTECH', 'AUTO', 'Automobile Engineering', 26),
  ('BTECH', 'BT', 'Biotechnology', 27),
  ('BTECH', 'BTBC', 'Biotechnology and Biochemical Engineering', 28),
  ('BTECH', 'CHEM', 'Chemical Engineering', 29),
  ('BTECH', 'CENV', 'Civil and Environmental Engineering', 30),
  ('BTECH', 'CPS', 'Cyber Physical Systems', 31),
  ('BTECH', 'FT', 'Food Technology', 32),
  ('BTECH', 'IE', 'Industrial Engineering', 33),
  ('BTECH', 'ICE', 'Instrumentation and Control Engineering', 34),
  ('BTECH', 'MCT', 'Mechatronics Engineering', 35),
  ('BTECH', 'MET', 'Metallurgical Engineering', 36),
  ('BTECH', 'NASB', 'Naval Architecture and Ship Building', 37),
  ('BTECH', 'POLY', 'Polymer Engineering', 38),
  ('BTECH', 'PROD', 'Production Engineering', 39),
  ('BTECH', 'SFE', 'Safety and Fire Engineering', 40),
  ('BCOM', 'FIN', 'Finance and Taxation', 1),
  ('BCOM', 'CA', 'Computer Applications', 2),
  ('BCOM', 'COOP', 'Co-operation', 3),
  ('BCOM', 'MKT', 'Marketing', 4),
  ('BCOM', 'TAX', 'Taxation', 5),
  ('BCOM', 'TTM', 'Travel and Tourism', 6),
  ('BCOM', 'LOG', 'Logistics Management', 7),
  ('BCOM', 'OMSP', 'Office Management and Secretarial Practice', 8),
  ('BSC', 'CS', 'Computer Science', 1),
  ('BSC', 'MATH', 'Mathematics', 2),
  ('BSC', 'PHY', 'Physics', 3),
  ('BSC', 'CHEM', 'Chemistry', 4),
  ('BSC', 'BOT', 'Botany', 5),
  ('BSC', 'ZOO', 'Zoology', 6),
  ('BSC', 'ELE', 'Electronics', 7),
  ('BSC', 'STAT', 'Statistics', 8),
  ('BSC', 'GEO', 'Geology', 9),
  ('BSC', 'PSY', 'Psychology', 10),
  ('BSC', 'BIOCHEM', 'Biochemistry', 11),
  ('BSC', 'BIOTECH', 'Biotechnology', 12),
  ('BSC', 'MICRO', 'Microbiology', 13),
  ('BSC', 'BIOINF', 'Bioinformatics', 14),
  ('BSC', 'AQUA', 'Aquaculture', 15),
  ('BSC', 'HS', 'Home Science', 16),
  ('BSC', 'FSC', 'Food Science and Quality Control', 17),
  ('BSC', 'CND', 'Clinical Nutrition and Dietetics', 18),
  ('BSC', 'IT', 'Information Technology', 19),
  ('BSC', 'AI', 'Artificial Intelligence', 20),
  ('BSC', 'ENV', 'Environmental Science', 21),
  ('BSC', 'GEN', 'Genetics', 22),
  ('BA', 'ENG', 'English Language and Literature', 1),
  ('BA', 'ECON', 'Economics', 2),
  ('BA', 'HIST', 'History', 3),
  ('BA', 'MAL', 'Malayalam Language and Literature', 4),
  ('BA', 'HIN', 'Hindi Language and Literature', 5),
  ('BA', 'POL', 'Political Science', 6),
  ('BA', 'SOC', 'Sociology', 7),
  ('BA', 'PSY', 'Psychology', 8),
  ('BA', 'PHI', 'Philosophy', 9),
  ('BA', 'SAN', 'Sanskrit', 10),
  ('BA', 'ARB', 'Arabic Language and Literature', 11),
  ('BA', 'MUS', 'Music', 12),
  ('BA', 'GEO', 'Geography', 13),
  ('BA', 'ISH', 'Islamic History', 14),
  ('BA', 'WAS', 'West Asian Studies', 15),
  ('BA', 'JMC', 'Journalism and Mass Communication', 16),
  ('BA', 'ENGCE', 'English and Communicative English', 17),
  ('BA', 'ANV', 'Animation and Visual Effects', 18),
  ('BA', 'VIS', 'Visual Arts', 19),
  ('BA', 'AUD', 'Audiography and Digital Editing', 20),
  ('MBA', 'FIN', 'Finance', 1),
  ('MBA', 'MKT', 'Marketing', 2),
  ('MBA', 'HR', 'Human Resource Management', 3),
  ('MBA', 'OPS', 'Operations & Analytics', 4),
  ('MBA', 'IT', 'Information Technology', 5),
  ('MBA', 'IB', 'International Business', 6),
  ('MBA', 'LSC', 'Logistics and Supply Chain Management', 7),
  ('MBA', 'BAN', 'Business Analytics', 8),
  ('MBA', 'HCM', 'Healthcare Management', 9),
  ('MTECH', 'CSE', 'Computer Science and Engineering', 1),
  ('MTECH', 'VLSI', 'VLSI and Embedded Systems', 2),
  ('MTECH', 'STRUCT', 'Structural Engineering', 3),
  ('MTECH', 'CIS', 'Computer and Information Science', 4),
  ('MTECH', 'SE', 'Software Engineering', 5),
  ('MTECH', 'IS', 'Information Security', 6),
  ('MTECH', 'ISCF', 'Information Security and Cyber Forensics', 7),
  ('MTECH', 'NET', 'Network Engineering', 8),
  ('MTECH', 'AIML', 'Artificial Intelligence and Machine Learning', 9),
  ('MTECH', 'AEI', 'Applied Electronics and Instrumentation Engineering', 10),
  ('MTECH', 'SP', 'Signal Processing', 11),
  ('MTECH', 'COMM', 'Communication Engineering', 12),
  ('MTECH', 'TELE', 'Telecommunication Engineering', 13),
  ('MTECH', 'MW', 'Microwave Engineering', 14),
  ('MTECH', 'MNE', 'Micro and Nano Electronics', 15),
  ('MTECH', 'OPTO', 'Optoelectronics and Optical Communication', 16),
  ('MTECH', 'CTRL', 'Control Systems', 17),
  ('MTECH', 'PSE', 'Power Systems Engineering', 18),
  ('MTECH', 'PSC', 'Power System and Control', 19),
  ('MTECH', 'PED', 'Power Electronics and Drives', 20),
  ('MTECH', 'EMD', 'Electrical Machines and Drives', 21),
  ('MTECH', 'GEO', 'Geotechnical Engineering', 22),
  ('MTECH', 'ENV', 'Environmental Engineering', 23),
  ('MTECH', 'HYD', 'Hydraulics', 24),
  ('MTECH', 'GEOINF', 'Geo Informatics', 25),
  ('MTECH', 'TRANS', 'Transportation Engineering', 26),
  ('MTECH', 'CASE', 'Computer Aided Structural Engineering', 27),
  ('MTECH', 'THERM', 'Thermal Engineering', 28),
  ('MTECH', 'TSES', 'Thermal Sciences and Energy Systems', 29),
  ('MTECH', 'MD', 'Machine Design', 30),
  ('MTECH', 'PROD', 'Production Engineering', 31),
  ('MTECH', 'IE', 'Industrial Engineering', 32),
  ('MTECH', 'FIN', 'Financial Engineering', 33),
  ('MTECH', 'TRANSL', 'Translational Engineering', 34),
  ('MTECH', 'IEM', 'Infrastructure Engineering and Management', 35),
  ('MTECH', 'EST', 'Embedded Systems Technology', 36),
  ('MTECH', 'VT', 'Vehicle Technology', 37),
  ('MTECH', 'MMT', 'Mechanical and Materials Technology', 38),
  ('MTECH', 'PROP', 'Propulsion Engineering', 39),
  ('MSC', 'CS', 'Computer Science', 1),
  ('MSC', 'MATH', 'Mathematics', 2),
  ('MSC', 'PHY', 'Physics', 3),
  ('MSC', 'CHEM', 'Chemistry', 4),
  ('MSC', 'BOT', 'Botany', 5),
  ('MSC', 'ZOO', 'Zoology', 6),
  ('MSC', 'STAT', 'Statistics', 7),
  ('MSC', 'ELE', 'Electronics', 8),
  ('MSC', 'GEO', 'Geology', 9),
  ('MSC', 'PSY', 'Applied Psychology', 10),
  ('MSC', 'BIOCHEM', 'Biochemistry', 11),
  ('MSC', 'BIOTECH', 'Biotechnology', 12),
  ('MSC', 'MICRO', 'Microbiology', 13),
  ('MSC', 'DS', 'Data Science', 14),
  ('MSC', 'BIOINF', 'Bioinformatics', 15),
  ('MSC', 'ENV', 'Environmental Sciences', 16),
  ('MSC', 'HS', 'Home Science', 17),
  ('MSC', 'AQUA', 'Aquaculture', 18),
  ('MSC', 'ACT', 'Actuarial Science', 19),
  ('MSC', 'DEM', 'Demography and Biostatistics', 20),
  ('MSC', 'CLIM', 'Climate Change and Disaster Management', 21),
  ('MSC', 'CBIO', 'Computational Biology', 22),
  ('MA', 'ENG', 'English Language and Literature', 1),
  ('MA', 'MAL', 'Malayalam Language and Literature', 2),
  ('MA', 'HIN', 'Hindi Language and Literature', 3),
  ('MA', 'ECON', 'Economics', 4),
  ('MA', 'HIST', 'History', 5),
  ('MA', 'POL', 'Political Science', 6),
  ('MA', 'SOC', 'Sociology', 7),
  ('MA', 'PHI', 'Philosophy', 8),
  ('MA', 'ARB', 'Arabic Language and Literature', 9),
  ('MA', 'SAN', 'Sanskrit', 10),
  ('MA', 'MUS', 'Music', 11),
  ('MA', 'PUB', 'Public Administration', 12),
  ('MA', 'LING', 'Linguistics', 13),
  ('MA', 'ISH', 'Islamic History', 14),
  ('MA', 'WAS', 'West Asian Studies', 15),
  ('MA', 'JMC', 'Journalism and Mass Communication', 16),
  ('MA', 'ARCH', 'Archaeology', 17),
  ('MA', 'GEO', 'Geography', 18),
  ('MCOM', 'FIN', 'Finance', 1),
  ('MCOM', 'FTAX', 'Finance and Taxation', 2),
  ('MCOM', 'GBO', 'Global Business Operations', 3),
  ('MCOM', 'RURAL', 'Rural Management', 4)
) AS v(programme_code, code, name, display_order)
JOIN public.programmes p ON p.code = v.programme_code
ON CONFLICT (programme_id, code) DO NOTHING;
