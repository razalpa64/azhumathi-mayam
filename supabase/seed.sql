-- ============================================================================
-- അഴിമതി മയം — Initial Authentic Academic Taxonomy Seed (Zero Fake Data)
-- ============================================================================

-- 1. Major Kerala Universities
INSERT INTO public.universities (name, short_name, location, website_url, display_order)
VALUES
  ('APJ Abdul Kalam Technological University', 'KTU', 'Thiruvananthapuram, Kerala', 'https://ktu.edu.in', 1),
  ('University of Kerala', 'KU', 'Thiruvananthapuram, Kerala', 'https://www.keralauniversity.ac.in', 2),
  ('Mahatma Gandhi University', 'MGU', 'Kottayam, Kerala', 'https://www.mgu.ac.in', 3),
  ('University of Calicut', 'CU', 'Malappuram, Kerala', 'https://uoc.ac.in', 4),
  ('Kannur University', 'KNU', 'Kannur, Kerala', 'https://www.kannuruniversity.ac.in', 5),
  ('Cochin University of Science and Technology', 'CUSAT', 'Kochi, Kerala', 'https://www.cusat.ac.in', 6)
ON CONFLICT (short_name) DO NOTHING;

-- 2. Degree Programmes
INSERT INTO public.programmes (code, name, full_title, degree_level, total_semesters, has_specializations, description, display_order)
VALUES
  ('BTECH', 'B.Tech', 'Bachelor of Technology', 'UG', 8, true, 'Four-year undergraduate engineering degree programme across 8 semesters.', 1),
  ('BCA', 'BCA', 'Bachelor of Computer Applications', 'UG', 6, false, 'Undergraduate computer applications and software development programme.', 2),
  ('BBA', 'BBA', 'Bachelor of Business Administration', 'UG', 6, false, 'Undergraduate business management and administration programme.', 3),
  ('BCOM', 'B.Com', 'Bachelor of Commerce', 'UG', 6, true, 'Undergraduate commerce, finance, and taxation programme.', 4),
  ('BSC', 'B.Sc', 'Bachelor of Science', 'UG', 6, true, 'Undergraduate pure and applied sciences programme.', 5),
  ('BA', 'BA', 'Bachelor of Arts', 'UG', 6, true, 'Undergraduate humanities, arts, and social sciences programme.', 6),
  ('MTECH', 'M.Tech', 'Master of Technology', 'PG', 4, true, 'Two-year postgraduate engineering specialization programme.', 7),
  ('MCA', 'MCA', 'Master of Computer Applications', 'PG', 4, false, 'Postgraduate computer applications and enterprise computing programme.', 8),
  ('MBA', 'MBA', 'Master of Business Administration', 'PG', 4, true, 'Postgraduate executive management and business leadership programme.', 9),
  ('MCOM', 'M.Com', 'Master of Commerce', 'PG', 4, true, 'Postgraduate commerce and financial studies programme.', 10),
  ('MA', 'MA', 'Master of Arts', 'PG', 4, true, 'Postgraduate humanities and social sciences programme.', 11),
  ('MSC', 'M.Sc', 'Master of Science', 'PG', 4, true, 'Postgraduate pure and applied sciences programme.', 12)
ON CONFLICT (code) DO NOTHING;

-- 3. Specializations — complete researched lists for every programme
-- (KTU branch list, Kerala FYUGP disciplines, KU/MG/CU PG subjects.
--  Same additions as migration 0005; either path produces one taxonomy.)
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

-- 4. Configurable Semesters per Programme (1 .. total_semesters)
DO $$
DECLARE
  rec RECORD;
  sem_idx INTEGER;
BEGIN
  FOR rec IN SELECT id, total_semesters FROM public.programmes LOOP
    FOR sem_idx IN 1..rec.total_semesters LOOP
      INSERT INTO public.semesters (programme_id, semester_number, label)
      VALUES (rec.id, sem_idx, 'Semester ' || sem_idx)
      ON CONFLICT (programme_id, semester_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 5. Academic Regulations / Schemes
DO $$
DECLARE
  v_ktu_id UUID;
  v_btech_id UUID;
BEGIN
  SELECT id INTO v_ktu_id FROM public.universities WHERE short_name = 'KTU';
  SELECT id INTO v_btech_id FROM public.programmes WHERE code = 'BTECH';

  INSERT INTO public.academic_regulations (university_id, programme_id, code, name, batch_range, display_order)
  VALUES
    (v_ktu_id, v_btech_id, 'KTU-2024', 'KTU 2024 Scheme', '2024 Onwards', 1),
    (v_ktu_id, v_btech_id, 'KTU-2019', 'KTU 2019 Scheme', '2019 – 2023 Admissions', 2),
    (NULL, NULL, 'FYUGP-2024', 'Kerala FYUGP 2024 Regulation', '2024 Onwards', 3),
    (NULL, NULL, 'CBCSS-UG', 'CBCSS Undergraduate Regulation', '2019 – 2023 Admissions', 4),
    (NULL, NULL, 'CSS-PG', 'Credit & Semester System (PG)', 'All Active Batches', 5)
  ON CONFLICT (code) DO NOTHING;
END $$;

-- 6. Resource Categories (All 12 required categories)
INSERT INTO public.resource_categories (name, slug, description, icon_name, is_question_paper, display_order)
VALUES
  ('Lecture Notes', 'lecture-notes', 'Comprehensive classroom and faculty lecture notes.', 'BookOpen', false, 1),
  ('Module-wise Notes', 'module-wise-notes', 'Structured syllabus notes organized module by module.', 'Layers', false, 2),
  ('Previous Year Question Papers', 'previous-year-question-papers', 'Official university examination papers from previous years.', 'FileQuestion', true, 3),
  ('Model Question Papers', 'model-question-papers', 'University and faculty model examination papers with schemes.', 'ClipboardCheck', true, 4),
  ('Question Banks', 'question-banks', 'Curated topic-wise and module-wise university question banks.', 'HelpCircle', true, 5),
  ('Assignments', 'assignments', 'Tutorial sheets, problem sets, and internal assessment tasks.', 'PenTool', false, 6),
  ('Lab Manuals', 'lab-manuals', 'Laboratory procedures, algorithms, and viva preparation guides.', 'FlaskConical', false, 7),
  ('Practical Records', 'practical-records', 'Reference laboratory records and verified experiment templates.', 'NotebookPen', false, 8),
  ('PPTs', 'ppts', 'Slide decks and visual lecture presentations.', 'Presentation', false, 9),
  ('Syllabus', 'syllabus', 'Official university curriculum, course outcomes, and marking schemes.', 'ScrollText', false, 10),
  ('Reference Materials', 'reference-materials', 'Handbooks, supplementary readings, and curated study guides.', 'Library', false, 11),
  ('Important Questions', 'important-questions', 'High-priority examination questions and sure-shot revision topics.', 'Sparkles', true, 12),
  ('Short Notes', 'short-notes', 'Quick revision short notes — the night-before-the-exam read.', 'NotebookPen', false, 13),
  ('Cheat Sheets', 'cheat-sheets', 'One-page formula sheets, charts and last-minute cheat sheets.', 'Zap', false, 14)
ON CONFLICT (slug) DO NOTHING;

-- 7. Authentic KTU B.Tech CSE Starter Curriculum Subjects (Editable from Admin)
DO $$
DECLARE
  v_ktu_id UUID;
  v_btech_id UUID;
  v_cse_id UUID;
  v_reg_id UUID;
  v_s1 UUID;
  v_s2 UUID;
  v_s3 UUID;
  v_s4 UUID;
  v_s5 UUID;
  v_s6 UUID;
BEGIN
  SELECT id INTO v_ktu_id FROM public.universities WHERE short_name = 'KTU';
  SELECT id INTO v_btech_id FROM public.programmes WHERE code = 'BTECH';
  SELECT id INTO v_cse_id FROM public.specializations WHERE programme_id = v_btech_id AND code = 'CSE';
  SELECT id INTO v_reg_id FROM public.academic_regulations WHERE code = 'KTU-2019';
  SELECT id INTO v_s1 FROM public.semesters WHERE programme_id = v_btech_id AND semester_number = 1;
  SELECT id INTO v_s2 FROM public.semesters WHERE programme_id = v_btech_id AND semester_number = 2;
  SELECT id INTO v_s3 FROM public.semesters WHERE programme_id = v_btech_id AND semester_number = 3;
  SELECT id INTO v_s4 FROM public.semesters WHERE programme_id = v_btech_id AND semester_number = 4;
  SELECT id INTO v_s5 FROM public.semesters WHERE programme_id = v_btech_id AND semester_number = 5;
  SELECT id INTO v_s6 FROM public.semesters WHERE programme_id = v_btech_id AND semester_number = 6;

  IF NOT EXISTS (SELECT 1 FROM public.subjects LIMIT 1) THEN
    INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, description, publication_status)
    VALUES
      (v_ktu_id, v_btech_id, NULL, v_reg_id, v_s1, 'MAT101', 'Linear Algebra and Calculus', 'Systems of linear equations, eigenvalues, multivariable calculus, and series.', 'published'),
      (v_ktu_id, v_btech_id, NULL, v_reg_id, v_s1, 'EST110', 'Engineering Graphics', 'Orthographic projections, section of solids, and CAD fundamentals.', 'published'),
      (v_ktu_id, v_btech_id, NULL, v_reg_id, v_s2, 'EST102', 'Programming in C', 'Structured programming, arrays, pointers, structures, and file handling in C.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s3, 'MAT203', 'Discrete Mathematical Structures', 'Propositional logic, relations, recurrence relations, group theory, and lattices.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s3, 'CST201', 'Data Structures', 'Stacks, queues, linked lists, trees, graphs, hashing, and complexity analysis.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s3, 'CST203', 'Logic System Design', 'Boolean algebra, combinational and sequential circuits, counters, and HDL.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s3, 'CST205', 'Object Oriented Programming Using Java', 'OOP principles, inheritance, interfaces, exception handling, multithreading, and Swing.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s4, 'CST202', 'Computer Organization and Architecture', 'Processor logic, control unit design, pipelining, memory hierarchy, and I/O.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s4, 'CST204', 'Database Management Systems', 'ER modeling, relational algebra, SQL, normalization, transactions, and indexing.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s4, 'CST206', 'Operating Systems', 'Process scheduling, synchronization, deadlocks, virtual memory, and file systems.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s5, 'CST301', 'Formal Languages and Automata Theory', 'Finite automata, regular expressions, context-free grammars, PDA, and Turing machines.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s5, 'CST303', 'Computer Networks', 'OSI/TCP-IP layers, data link protocols, routing algorithms, congestion control, and DNS.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s6, 'CST302', 'Compiler Design', 'Lexical analysis, parsing techniques, syntax-directed translation, and code optimization.', 'published'),
      (v_ktu_id, v_btech_id, v_cse_id, v_reg_id, v_s6, 'CST306', 'Algorithm Analysis and Design', 'Divide and conquer, greedy, dynamic programming, backtracking, and NP-completeness.', 'published');
  END IF;
END $$;
