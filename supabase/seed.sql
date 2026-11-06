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
  ('MCOM', 'M.Com', 'Master of Commerce', 'PG', 4, false, 'Postgraduate commerce and financial studies programme.', 10),
  ('MA', 'MA', 'Master of Arts', 'PG', 4, true, 'Postgraduate humanities and social sciences programme.', 11)
ON CONFLICT (code) DO NOTHING;

-- 3. B.Tech Specializations (7 core branches) + essential B.Sc / B.Com / BA / MBA streams
DO $$
DECLARE
  v_btech_id UUID;
  v_bcom_id UUID;
  v_bsc_id UUID;
  v_ba_id UUID;
  v_mba_id UUID;
  v_mtech_id UUID;
BEGIN
  SELECT id INTO v_btech_id FROM public.programmes WHERE code = 'BTECH';
  SELECT id INTO v_bcom_id FROM public.programmes WHERE code = 'BCOM';
  SELECT id INTO v_bsc_id FROM public.programmes WHERE code = 'BSC';
  SELECT id INTO v_ba_id FROM public.programmes WHERE code = 'BA';
  SELECT id INTO v_mba_id FROM public.programmes WHERE code = 'MBA';
  SELECT id INTO v_mtech_id FROM public.programmes WHERE code = 'MTECH';

  IF v_btech_id IS NOT NULL THEN
    INSERT INTO public.specializations (programme_id, code, name, display_order) VALUES
      (v_btech_id, 'CSE', 'Computer Science and Engineering', 1),
      (v_btech_id, 'AIML', 'Artificial Intelligence and Machine Learning', 2),
      (v_btech_id, 'IT', 'Information Technology', 3),
      (v_btech_id, 'ECE', 'Electronics and Communication Engineering', 4),
      (v_btech_id, 'EEE', 'Electrical and Electronics Engineering', 5),
      (v_btech_id, 'ME', 'Mechanical Engineering', 6),
      (v_btech_id, 'CE', 'Civil Engineering', 7)
    ON CONFLICT (programme_id, code) DO NOTHING;
  END IF;

  IF v_bcom_id IS NOT NULL THEN
    INSERT INTO public.specializations (programme_id, code, name, display_order) VALUES
      (v_bcom_id, 'FIN', 'Finance and Taxation', 1),
      (v_bcom_id, 'CA', 'Computer Applications', 2),
      (v_bcom_id, 'COOP', 'Co-operation', 3)
    ON CONFLICT (programme_id, code) DO NOTHING;
  END IF;

  IF v_bsc_id IS NOT NULL THEN
    INSERT INTO public.specializations (programme_id, code, name, display_order) VALUES
      (v_bsc_id, 'CS', 'Computer Science', 1),
      (v_bsc_id, 'MATH', 'Mathematics', 2),
      (v_bsc_id, 'PHY', 'Physics', 3),
      (v_bsc_id, 'CHEM', 'Chemistry', 4)
    ON CONFLICT (programme_id, code) DO NOTHING;
  END IF;

  IF v_ba_id IS NOT NULL THEN
    INSERT INTO public.specializations (programme_id, code, name, display_order) VALUES
      (v_ba_id, 'ENG', 'English Language and Literature', 1),
      (v_ba_id, 'ECON', 'Economics', 2),
      (v_ba_id, 'HIST', 'History', 3)
    ON CONFLICT (programme_id, code) DO NOTHING;
  END IF;

  IF v_mba_id IS NOT NULL THEN
    INSERT INTO public.specializations (programme_id, code, name, display_order) VALUES
      (v_mba_id, 'FIN', 'Finance', 1),
      (v_mba_id, 'MKT', 'Marketing', 2),
      (v_mba_id, 'HR', 'Human Resource Management', 3),
      (v_mba_id, 'OPS', 'Operations & Analytics', 4)
    ON CONFLICT (programme_id, code) DO NOTHING;
  END IF;

  IF v_mtech_id IS NOT NULL THEN
    INSERT INTO public.specializations (programme_id, code, name, display_order) VALUES
      (v_mtech_id, 'CSE', 'Computer Science and Engineering', 1),
      (v_mtech_id, 'VLSI', 'VLSI and Embedded Systems', 2),
      (v_mtech_id, 'STRUCT', 'Structural Engineering', 3)
    ON CONFLICT (programme_id, code) DO NOTHING;
  END IF;
END $$;

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
