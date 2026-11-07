-- ============================================================================
-- 0010 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - B.Sc majors
--        tranche 2: Psychology, Computer Science, Statistics, Geology,
--        Zoology (Honours, S1-S8)
-- ----------------------------------------------------------------------------
-- Source: University of Calicut official Scheme & Syllabus PDFs issued
-- under the CUFYUGP Regulations 2024, LATEST versions only:
--   * Psychology       - U.O.No. 2771/2025/Admn (2025-02-18)
--   * Computer Science - U.O.No. 9924/2024/Admn (2024-06-22)
--   * Statistics       - Revised scheme, U.O.No. 13697/2024/Admn
--                        (2024-09-07)
--   * Geology          - Corrected Scheme & Syllabus (2024-06-02)
--   * Zoology          - U.O.No. 9579/2024/Admn (2024-06-19)
-- Transcribed from each PDF's published Course Structure / Distribution
-- of Major Courses tables and Elective Courses in Major tables; nothing
-- invented. Dual codes (e.g. PSY1CJ101 / PSY1MN100) use the major (CJ)
-- code. Printed spaces in codes are removed ('ZOO1CJ 101' -> 'ZOO1CJ101').
--
-- Scope per major (S1-S8): all Core Courses in Major, S6 Internship in
-- Major, S8 Project (Honours / Honours with Research), Research
-- Methodology, discipline Skill Enhancement Courses coded in the
-- structure tables, and the complete published Elective Courses in
-- Major baskets - same scope rule as migration 0009. Excluded: Minor
-- courses and university-common foundation courses (AEC/MDC/VAC and
-- general SECs).
--
-- Source quirks kept faithful (documented, not silently 'fixed'):
--   * Statistics: the PDF's Course Structure table prints the S6 core
--     codes as STA6CJ301-303 while its Distribution of Major Courses
--     table prints STA6CJ304-306. The Distribution table is followed
--     (it matches every other Calicut major's numbering: S5 301-303,
--     S6 304-306).
--   * Computer Science elective codes are printed with a CJ/EJ mix
--     and letter suffixes (CSC5EJ305a, CSC6CJ311a, CSC5EJ311b...);
--     they are stored exactly as printed.
--   * Geology/Geography batch-A1 double-major variants of early core
--     courses (e.g. GEL1CJ102) are the same courses taken a semester
--     earlier by double-major batches; each course is stored once,
--     in its standard semester (GEL2CJ101 etc.).
--   * Psychology's S6 discipline SEC (PSY6FS113) is printed in the
--     structure table without a course title, so it is not inserted.
--   * Zoology and Geology titles are printed in capitals in the
--     source; they are normalised to title case here, codes and
--     semesters exact. Geology courses carry GEL codes while the
--     specialization is Geology (GEO).
--
-- Idempotent: a row is skipped when the same subject code already
-- exists for the same programme + semester + specialization + scheme.
-- Requires 0001 (schema), the seed taxonomy and 0005
-- (specializations); B.Sc semesters 7/8 self-healed below (created
-- by 0009 on a normal install).
-- ============================================================================

-- Semesters 7 and 8 for B.Sc (FYUGP honours years; harmless if present)
INSERT INTO public.semesters (programme_id, semester_number, label)
SELECT p.id, n, 'Semester ' || n
FROM public.programmes p
CROSS JOIN (VALUES (7), (8)) AS t(n)
WHERE p.code = 'BSC'
ON CONFLICT (programme_id, semester_number) DO NOTHING;

INSERT INTO public.subjects (university_id, programme_id, specialization_id, regulation_id, semester_id, subject_code, name, publication_status)
SELECT u.id, p.id, sp.id, r.id, sem.id, v.code, v.name, 'published'
FROM (VALUES
  ('PSY', 1, 'PSY1CJ101', 'Invitation to Psychology'),
  ('PSY', 2, 'PSY2CJ101', 'Science of Mental Processes'),
  ('PSY', 3, 'PSY3CJ201', 'Psychological Assessment'),
  ('PSY', 3, 'PSY3CJ202', 'Individual Differences'),
  ('PSY', 4, 'PSY4CJ203', 'Child and Adolescent Development'),
  ('PSY', 4, 'PSY4CJ204', 'Foundations of Social Behaviour'),
  ('PSY', 4, 'PSY4CJ205', 'Biological Basis of Behaviour'),
  ('PSY', 5, 'PSY5CJ301', 'Organizational Behaviour'),
  ('PSY', 5, 'PSY5CJ302', 'Development in Adulthood'),
  ('PSY', 5, 'PSY5CJ303', 'Foundations of Abnormal Psychology'),
  ('PSY', 6, 'PSY6CJ304', 'Abnormal Psychology: Exploring the Depths'),
  ('PSY', 6, 'PSY6CJ305', 'Introduction to Psychological Research'),
  ('PSY', 6, 'PSY6CJ306', 'Psychological Counselling'),
  ('PSY', 6, 'PSY6CJ349', 'Internship in Major'),
  ('PSY', 7, 'PSY7CJ401', 'Applied Social Psychology'),
  ('PSY', 7, 'PSY7CJ402', 'Health Psychology: Theory and Practice'),
  ('PSY', 7, 'PSY7CJ403', 'Rehabilitation Psychology'),
  ('PSY', 7, 'PSY7CJ404', 'Orientation to Psychological Interventions'),
  ('PSY', 7, 'PSY7CJ405', 'Human Resource Planning and Development'),
  ('PSY', 8, 'PSY8CJ406', 'Assessments in Counselling and Clinical Settings'),
  ('PSY', 8, 'PSY8CJ407', 'Applied Psychology'),
  ('PSY', 8, 'PSY8CJ408', 'Foundations of Neuropsychology'),
  ('PSY', 8, 'PSY8CJ449', 'Project (Honours Programme)'),
  ('PSY', 8, 'PSY8CJ499', 'Project (Honours with Research Programme)'),
  ('PSY', 8, 'PSY8CJ489', 'Advanced Research Methods in Psychology'),
  ('PSY', 5, 'PSY5EJ301', 'Positive Psychology'),
  ('PSY', 5, 'PSY5EJ302', 'Educational Psychology'),
  ('PSY', 5, 'PSY5EJ303', 'Psychology of Cyber Space'),
  ('PSY', 5, 'PSY5EJ304', 'Sports Psychology'),
  ('PSY', 6, 'PSY6EJ301', 'Forensic Psychology'),
  ('PSY', 6, 'PSY6EJ302', 'Cultural Psychology'),
  ('PSY', 6, 'PSY6EJ303', 'Foundations of Professional Development'),
  ('PSY', 6, 'PSY6EJ304', 'Comprehensive Sexuality Education'),
  ('PSY', 8, 'PSY8EJ401', 'Psychological Processes in Advertising'),
  ('PSY', 8, 'PSY8EJ402', 'Advanced Cognitive Psychology'),
  ('PSY', 8, 'PSY8EJ403', 'An Introduction to Psycho-Oncology'),
  ('PSY', 8, 'PSY8EJ404', 'Critical Psychology'),
  ('PSY', 8, 'PSY8EJ405', 'Media Psychology: Understanding Influence'),
  ('CS', 1, 'CSC1CJ101', 'Fundamentals of Computers & Computational Thinking'),
  ('CS', 2, 'CSC2CJ101', 'Fundamentals of Programming (C Language)'),
  ('CS', 3, 'CSC3CJ201', 'Software Project Management'),
  ('CS', 3, 'CSC3CJ202', 'Data Structures and Algorithms'),
  ('CS', 4, 'CSC4CJ203', 'Database Management System'),
  ('CS', 4, 'CSC4CJ204', 'Python Programming'),
  ('CS', 4, 'CSC4CJ205', 'Computer Networks'),
  ('CS', 5, 'CSC5CJ301', 'Data Mining'),
  ('CS', 5, 'CSC5CJ302', 'Object Oriented Programming (Java)'),
  ('CS', 5, 'CSC5CJ303', 'Full Stack Web Development'),
  ('CS', 5, 'CSC5FS112', 'Introduction to Digital Marketing'),
  ('CS', 6, 'CSC6CJ304', 'Digital Electronics and Computer Architecture'),
  ('CS', 6, 'CSC6CJ305', 'Principles of Operating Systems'),
  ('CS', 6, 'CSC6CJ306', 'Introduction to Artificial Intelligence & Machine Learning'),
  ('CS', 6, 'CSC6CJ349', 'Internship in Major'),
  ('CS', 6, 'CSC6FS113', 'Project Implementation'),
  ('CS', 7, 'CSC7CJ401', 'Theory of Computation'),
  ('CS', 7, 'CSC7CJ402', 'System Security'),
  ('CS', 7, 'CSC7CJ403', 'Advanced Data Structures and Algorithms'),
  ('CS', 7, 'CSC7CJ404', 'Blockchain Technology'),
  ('CS', 7, 'CSC7CJ405', 'Internet of Things'),
  ('CS', 8, 'CSC8CJ406', 'Compiler Design'),
  ('CS', 8, 'CSC8CJ407', 'Client-Server Architecture'),
  ('CS', 8, 'CSC8CJ408', 'Parallel Computing'),
  ('CS', 8, 'CSC8CJ449', 'Project (in Honours programme)'),
  ('CS', 8, 'CSC8CJ499', 'Research Project (in Honours with Research programme)'),
  ('CS', 8, 'CSC8CJ489', 'Research Methodology'),
  ('CS', 5, 'CSC5EJ305a', 'Mathematical and Statistical Foundation for Data Science'),
  ('CS', 5, 'CSC5EJ306a', 'Exploratory Data Analysis'),
  ('CS', 6, 'CSC6CJ311a', 'Introduction to Data Warehousing and Big Data'),
  ('CS', 6, 'CSC6CJ312a', 'Advanced Python for Data Science'),
  ('CS', 5, 'CSC5EJ305b', 'Machine Learning Algorithms'),
  ('CS', 5, 'CSC5EJ306b', 'Knowledge Engineering'),
  ('CS', 6, 'CSC5EJ311b', 'Soft Computing'),
  ('CS', 6, 'CSC5EJ312b', 'Deep Learning'),
  ('CS', 5, 'CSC5EJ305c', 'Cloud Computing'),
  ('CS', 5, 'CSC5EJ306c', 'Security and Privacy in Cloud'),
  ('CS', 6, 'CSC6CJ311c', 'Storage Technologies'),
  ('CS', 6, 'CSC6CJ312c', 'Virtualization'),
  ('CS', 8, 'CSC8EJ401', 'Microprocessor and its Applications'),
  ('CS', 8, 'CSC8EJ402', 'System Software'),
  ('CS', 8, 'CSC8EJ403', 'Social Network Analysis'),
  ('CS', 8, 'CSC8EJ404', 'Advanced Distributed Computing'),
  ('CS', 8, 'CSC8EJ405', 'Cyber Forensic'),
  ('CS', 8, 'CSC8EJ406', 'Ethical Hacking'),
  ('CS', 8, 'CSC8EJ407', 'Expert System and Fuzzy Logic'),
  ('STAT', 1, 'STA1CJ101', 'Univariate Data Analysis'),
  ('STAT', 2, 'STA2CJ101', 'Bivariate Data Analysis'),
  ('STAT', 3, 'STA3CJ201', 'Mathematical Methods for Statistics I'),
  ('STAT', 3, 'STA3CJ202', 'Probability and Random Variables'),
  ('STAT', 4, 'STA4CJ201', 'Probability Distributions'),
  ('STAT', 4, 'STA4CJ202', 'Bivariate Random Variables and Limit Theorems'),
  ('STAT', 4, 'STA4CJ203', 'Applied Statistics: Time Series, Index Numbers & Official Statistics'),
  ('STAT', 5, 'STA5CJ301', 'Estimation'),
  ('STAT', 5, 'STA5CJ302', 'Sampling Methods'),
  ('STAT', 5, 'STA5CJ303', 'Testing of Hypothesis'),
  ('STAT', 5, 'STA5FS101', 'Statistical Analysis Using Python'),
  ('STAT', 6, 'STA6CJ304', 'Linear Regression Analysis'),
  ('STAT', 6, 'STA6CJ305', 'Design and Analysis of Experiments'),
  ('STAT', 6, 'STA6CJ306', 'Stochastic Processes'),
  ('STAT', 6, 'STA6CJ349', 'Internship in Major'),
  ('STAT', 6, 'STA6FS102', 'Basic Research Methodology'),
  ('STAT', 7, 'STA7CJ401', 'Advanced Analytical Tools'),
  ('STAT', 7, 'STA7CJ402', 'Probability Theory'),
  ('STAT', 7, 'STA7CJ403', 'Distribution Theory'),
  ('STAT', 7, 'STA7CJ404', 'Advanced Sampling Methods & Design of Experiments'),
  ('STAT', 7, 'STA7CJ405', 'Advanced Statistical Inference'),
  ('STAT', 8, 'STA8CJ406', 'Applied Stochastic Processes and Time Series Analysis'),
  ('STAT', 8, 'STA8CJ407', 'Applied Multivariate Techniques'),
  ('STAT', 8, 'STA8CJ408', 'Generalized Linear Models'),
  ('STAT', 8, 'STA8CJ449', 'Project (in Honours programme)'),
  ('STAT', 8, 'STA8CJ499', 'Research Project (in Honours with Research programme)'),
  ('STAT', 8, 'STA8CJ489', 'Research Methodology'),
  ('STAT', 5, 'STA5EJ301', 'Statistical Quality Control'),
  ('STAT', 5, 'STA5EJ302', 'Optimization Techniques'),
  ('STAT', 5, 'STA5EJ303', 'Biostatistics'),
  ('STAT', 5, 'STA5EJ304', 'Econometrics'),
  ('STAT', 5, 'STA5EJ305', 'Official Statistics'),
  ('STAT', 5, 'STA5EJ306', 'Longitudinal Data Analysis'),
  ('STAT', 6, 'STA6EJ301', 'Simulation Techniques'),
  ('STAT', 6, 'STA6EJ302', 'Reliability Theory'),
  ('STAT', 6, 'STA6EJ303', 'Life Time Data Analysis'),
  ('STAT', 6, 'STA6EJ304', 'Demography'),
  ('STAT', 6, 'STA6EJ305', 'Actuarial Statistics'),
  ('STAT', 8, 'STA8EJ411', 'Statistical Methods for Machine Learning'),
  ('STAT', 8, 'STA8EJ412', 'Operations Research'),
  ('STAT', 8, 'STA8EJ413', 'Queueing Models'),
  ('STAT', 8, 'STA8EJ414', 'Statistical Decision Theory'),
  ('STAT', 8, 'STA8EJ415', 'Analysis of Clinical Trials'),
  ('STAT', 8, 'STA8EJ416', 'Applied Algorithms and Big Data Techniques'),
  ('STAT', 8, 'STA8EJ417', 'Advanced Trends in Statistics'),
  ('GEO', 1, 'GEL1CJ101', 'Introduction to Geology'),
  ('GEO', 2, 'GEL2CJ101', 'Processes at the Earth''s Surface'),
  ('GEO', 3, 'GEL3CJ201', 'Introductory Geoinformatics'),
  ('GEO', 3, 'GEL3CJ202', 'Crystallography & Stratigraphy'),
  ('GEO', 4, 'GEL4CJ203', 'Geoinformatics & Field Geology - I'),
  ('GEO', 4, 'GEL4CJ204', 'Mineralogy'),
  ('GEO', 4, 'GEL4CJ205', 'Sedimentary Petrology & Palaeontology'),
  ('GEO', 5, 'GEL5CJ301', 'Geoinformatics & Field Geology - II'),
  ('GEO', 5, 'GEL5CJ302', 'Igneous Petrology'),
  ('GEO', 5, 'GEL5CJ303', 'Metamorphic Petrology'),
  ('GEO', 6, 'GEL6CJ304', 'Economic Geology'),
  ('GEO', 6, 'GEL6CJ305', 'Structural Geology & Geotectonics'),
  ('GEO', 6, 'GEL6CJ306', 'Indian Geology'),
  ('GEO', 6, 'GEL6CJ349', 'Internship in Major'),
  ('GEO', 6, 'GEL6FS113', 'Content Writing in Geology'),
  ('GEO', 7, 'GEL7CJ401', 'Hydrogeology'),
  ('GEO', 7, 'GEL7CJ402', 'Applied Geomorphology'),
  ('GEO', 7, 'GEL7CJ403', 'Advanced Palaeontology'),
  ('GEO', 7, 'GEL7CJ404', 'Marine Geology'),
  ('GEO', 7, 'GEL7CJ405', 'Advanced Mineralogy & Crystallography'),
  ('GEO', 8, 'GEL8CJ406', 'Geoinformatics Applications'),
  ('GEO', 8, 'GEL8CJ407', 'Engineering Geology'),
  ('GEO', 8, 'GEL8CJ408', 'Exploration Geology'),
  ('GEO', 8, 'GEL8CJ449', 'Project (in Honours programme)'),
  ('GEO', 8, 'GEL8CJ499', 'Research Project (in Honours with Research programme)'),
  ('GEO', 8, 'GEL8CJ489', 'Research Methodology in Geology'),
  ('GEO', 5, 'GEL5EJ301', 'Mine Planning & Resource Estimation'),
  ('GEO', 5, 'GEL5EJ302', 'Geotechnical Engineering'),
  ('GEO', 6, 'GEL6EJ301', 'Survey Techniques'),
  ('GEO', 6, 'GEL6EJ302', 'Offshore Mineral Resources & Mining'),
  ('GEO', 5, 'GEL5EJ303', 'Environmental Geology'),
  ('GEO', 5, 'GEL5EJ304', 'Natural Disaster Management'),
  ('GEO', 6, 'GEL6EJ303', 'Environmental Impact Assessment'),
  ('GEO', 6, 'GEL6EJ304', 'Geology & Climate Change'),
  ('GEO', 8, 'GEL8EJ401', 'Climatology'),
  ('GEO', 8, 'GEL8EJ402', 'Environmental Informatics'),
  ('GEO', 8, 'GEL8EJ403', 'Remote Sensing for Geology'),
  ('GEO', 8, 'GEL8EJ404', 'Oceanography'),
  ('GEO', 8, 'GEL8EJ405', 'Analytical Techniques in Geology'),
  ('GEO', 8, 'GEL8EJ406', 'Introduction to Soil Science'),
  ('ZOO', 1, 'ZOO1CJ101', 'An Overview of Human Physiology: Life Sustaining Systems'),
  ('ZOO', 2, 'ZOO2CJ102', 'Environmental Biology & Animal Behaviour'),
  ('ZOO', 3, 'ZOO3CJ201', 'Systematics, Evolution & Zoogeography'),
  ('ZOO', 3, 'ZOO3CJ202', 'Practices in Entomology, Poultry Science and Dairy Science'),
  ('ZOO', 4, 'ZOO4CJ203', 'Animal Diversity - I - Non Chordata'),
  ('ZOO', 4, 'ZOO4CJ204', 'Cell Biology & Genetics'),
  ('ZOO', 4, 'ZOO4CJ205', 'Basics in Aquaculture and Fishery Science Practices'),
  ('ZOO', 5, 'ZOO5CJ301', 'Animal Diversity - II - Chordata'),
  ('ZOO', 5, 'ZOO5CJ302', 'Biostatistics & Bio-Techniques'),
  ('ZOO', 5, 'ZOO5CJ303', 'Foundations of Molecular Biology & Bioinformatics'),
  ('ZOO', 6, 'ZOO6CJ304', 'Fundamentals of Biochemistry & Microbiology'),
  ('ZOO', 6, 'ZOO6CJ305', 'Basics of Biotechnology & Immunology'),
  ('ZOO', 6, 'ZOO6CJ306', 'Foundations of Endocrinology, Developmental Biology & Reproductive Biology'),
  ('ZOO', 6, 'ZOO6CJ349', 'Internship in Major'),
  ('ZOO', 6, 'ZOO6FS113', 'IT Skills in Biostatistics & Bioinformatics'),
  ('ZOO', 7, 'ZOO7CJ401', 'Physiology'),
  ('ZOO', 7, 'ZOO7CJ402', 'Enzymology & Clinical Biochemistry'),
  ('ZOO', 7, 'ZOO7CJ403', 'Advances in Ecological & Evolutionary Studies'),
  ('ZOO', 7, 'ZOO7CJ404', 'Molecular Biology & Cytogenetics'),
  ('ZOO', 7, 'ZOO7CJ405', 'Comparative Anatomy & Developmental Biology'),
  ('ZOO', 8, 'ZOO8CJ406', 'Computational Biology & Statistical Applications'),
  ('ZOO', 8, 'ZOO8CJ407', 'Advances and Applications of Immunology'),
  ('ZOO', 8, 'ZOO8CJ408', 'Advances in Biotechnology & Microbial Processing'),
  ('ZOO', 8, 'ZOO8CJ449', 'Project (in Honours programme)'),
  ('ZOO', 8, 'ZOO8CJ499', 'Project (in Honours with Research programme)'),
  ('ZOO', 8, 'ZOO8CJ489', 'Research Methodology in Zoology'),
  ('ZOO', 5, 'ZOO5EJ301(1)', 'Entomology - I - Structure, Adaptations and Classification of Insects'),
  ('ZOO', 5, 'ZOO5EJ302(1)', 'Entomology - II - Agricultural Entomology'),
  ('ZOO', 6, 'ZOO6EJ303(1)', 'Entomology - III - Insect Ecology'),
  ('ZOO', 6, 'ZOO6EJ304(1)', 'Entomology - IV - Insect Pest Management'),
  ('ZOO', 5, 'ZOO5EJ303(2)', 'Fishery Science - I - Fundamentals of Fishery Science'),
  ('ZOO', 5, 'ZOO5EJ304(2)', 'Fishery Science II: Fish Taxonomy, Fish Biology and Fish Physiology'),
  ('ZOO', 6, 'ZOO6EJ303(2)', 'Fishery Science - III - Capture and Culture Techniques'),
  ('ZOO', 6, 'ZOO6EJ304(2)', 'Fishery Science - IV - Harvesting and Post-Harvesting Techniques'),
  ('ZOO', 5, 'ZOO5EJ305(3)', 'Human Genetics - I - Introduction to Human Genetics'),
  ('ZOO', 5, 'ZOO5EJ306(3)', 'Human Genetics - II - Human Cytogenetics'),
  ('ZOO', 6, 'ZOO6EJ305(3)', 'Human Genetics - III - Genetic Diseases and Counselling'),
  ('ZOO', 6, 'ZOO6EJ306(3)', 'Human Genetics - IV - Techniques, Genome and Computation'),
  ('ZOO', 5, 'ZOO5EJ307(4)', 'Wildlife Biology - I - Biodiversity & Biota'),
  ('ZOO', 5, 'ZOO5EJ308(4)', 'Wildlife Biology - II - Ornithology and Mammalology'),
  ('ZOO', 6, 'ZOO6EJ307(4)', 'Wildlife Biology - III - Field Techniques in Wildlife Studies'),
  ('ZOO', 6, 'ZOO6EJ308(4)', 'Wildlife Biology - IV - Wildlife Conservation and Management'),
  ('ZOO', 8, 'ZOO8EJ401', 'Environmental Biology - I - Environmental Legislation and Impact Assessment'),
  ('ZOO', 8, 'ZOO8EJ402', 'Environmental Biology - II - Environmental Chemistry'),
  ('ZOO', 8, 'ZOO8EJ403', 'Environmental Biology - III - Environmental Microbiology and Biotechnology'),
  ('ZOO', 8, 'ZOO8EJ404', 'Parasitology - I - General Parasitology & Non Helminth Parasites'),
  ('ZOO', 8, 'ZOO8EJ405', 'Parasitology - II - Helminthology'),
  ('ZOO', 8, 'ZOO8EJ406', 'Parasitology - III - Biochemical, Molecular and Immunological Aspects of Parasitism'),
  ('ZOO', 8, 'ZOO8EJ407', 'Forensic Biology - I - Biological Evidences & Forensic Serology'),
  ('ZOO', 8, 'ZOO8EJ408', 'Forensic Biology - II - Wildlife Forensics and Forensic Medicine'),
  ('ZOO', 8, 'ZOO8EJ409', 'Forensic Biology - III - Forensic Entomology'),
  ('ZOO', 8, 'ZOO8EJ410', 'Marine Biology - I - Threats to Marine Ecosystem'),
  ('ZOO', 8, 'ZOO8EJ411', 'Marine Biology - II - Marine Resources and Planktonology'),
  ('ZOO', 8, 'ZOO8EJ412', 'Marine Biology - III - Advances in Marine Biology')
) AS v(spec_code, semester_number, code, name)
JOIN public.universities u ON u.short_name = 'CU'
JOIN public.programmes p ON p.code = 'BSC'
LEFT JOIN public.specializations sp
  ON sp.programme_id = p.id AND sp.code = v.spec_code
JOIN public.academic_regulations r ON r.code = 'FYUGP-2024'
JOIN public.semesters sem
  ON sem.programme_id = p.id AND sem.semester_number = v.semester_number
WHERE sp.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.programme_id = p.id
      AND s.semester_id = sem.id
      AND s.specialization_id IS NOT DISTINCT FROM sp.id
      AND s.regulation_id = r.id
      AND s.subject_code = v.code
  );
