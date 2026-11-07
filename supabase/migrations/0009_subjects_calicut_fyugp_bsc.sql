-- ============================================================================
-- 0009 - Subjects: University of Calicut, FYUGP 2024 (CUFYUGP) - B.Sc majors:
--        Physics, Mathematics, Chemistry, Botany (Honours, S1-S8)
-- ----------------------------------------------------------------------------
-- Source: University of Calicut official Scheme & Syllabus PDFs issued
-- under the CUFYUGP Regulations 2024, LATEST versions only:
--   * Physics     - modified scheme, U.O.No. 117/2026 (syllabus 2024-08-29)
--   * Mathematics - modified scheme, U.O.No. 14567/2024/Admn (2024-09-26)
--   * Chemistry   - revised scheme,  U.O.No. 13302/2024/Admn (2024-09-02)
--   * Botany      - modified scheme, U.O.No. 4007/2025/Admn (2025-03-11)
-- Transcribed from each PDF's published Course Structure table and
-- Elective Courses in Major tables; nothing invented. Where a course
-- carries a dual code (e.g. PHY1CJ101 / PHY1MN100), the major code
-- (CJ) is used - the MN code is the same course offered as a Minor to
-- other disciplines. Printed spaces in codes are removed
-- ('PHY1CJ 101' -> 'PHY1CJ101').
--
-- Scope of this migration (per major, S1-S8):
--   * All Core Courses in Major (CJ-coded), the S6 Internship in Major,
--     S8 Project (Honours / Honours with Research) and Research
--     Methodology, and the discipline Skill Enhancement Course coded
--     in the S6 structure table where one is printed
--   * The complete Elective Courses in Major baskets (with and
--     without specialisation) exactly as published
--   * The Physics elective 'Optoelectronics and Semiconductor Devices'
--     is printed with a dual code (PHY6EJ302(1)/PHY6EJ304(2)) across
--     two specialisation groups; it is inserted once as PHY6EJ302(1)
--   * Deliberately excluded: Minor courses (taken by other majors),
--     Multi-Disciplinary / Value-Added / Ability Enhancement /
--     general Skill Enhancement foundation courses (university-common
--     or other-discipline choices, not the major's own subjects) -
--     same rule as migrations 0006-0008
--   * Chemistry titles are printed in capitals in the source; they
--     are normalised to title case here, codes/semesters exact
--
-- FYUGP is a four-year (8-semester) honours programme while B.Sc is
-- seeded with 6 semesters, so Semester 7 and 8 rows for B.Sc are
-- created below (subject rows themselves stay scoped to Calicut +
-- FYUGP-2024, so other universities/schemes are unaffected).
--
-- Idempotent: a row is skipped when the same subject code already
-- exists for the same programme + semester + specialization + scheme.
-- Requires 0001 (schema), the seed taxonomy and 0005
-- (specializations); semesters are self-healed below.
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
  ('PHY', 1, 'PHY1CJ101', 'Fundamentals of Physics'),
  ('PHY', 2, 'PHY2CJ101', 'Electronics - I'),
  ('PHY', 3, 'PHY3CJ201', 'Mechanics - I'),
  ('PHY', 3, 'PHY3CJ202', 'Computational Physics'),
  ('PHY', 4, 'PHY4CJ203', 'Electrodynamics - I'),
  ('PHY', 4, 'PHY4CJ204', 'Mechanics - II'),
  ('PHY', 4, 'PHY4CJ205', 'Modern Physics'),
  ('PHY', 5, 'PHY5CJ301', 'Electrodynamics - II'),
  ('PHY', 5, 'PHY5CJ302', 'Optics'),
  ('PHY', 5, 'PHY5CJ303', 'Quantum Mechanics - I'),
  ('PHY', 6, 'PHY6CJ304', 'Thermodynamics'),
  ('PHY', 6, 'PHY6CJ305', 'Electronics - II'),
  ('PHY', 6, 'PHY6CJ306', 'Nuclear and Particle Physics'),
  ('PHY', 6, 'PHY6CJ349', 'Internship in Major'),
  ('PHY', 6, 'PHY6FS113', 'Electrical and Photovoltaic Devices'),
  ('PHY', 7, 'PHY7CJ401', 'Mathematical Physics'),
  ('PHY', 7, 'PHY7CJ402', 'Classical Mechanics'),
  ('PHY', 7, 'PHY7CJ403', 'Quantum Mechanics - II'),
  ('PHY', 7, 'PHY7CJ404', 'Statistical Mechanics'),
  ('PHY', 7, 'PHY7CJ405', 'Electronics - III'),
  ('PHY', 8, 'PHY8CJ406', 'Solid State Physics'),
  ('PHY', 8, 'PHY8CJ407', 'Spectroscopy'),
  ('PHY', 8, 'PHY8CJ408', 'Electrodynamics - III'),
  ('PHY', 8, 'PHY8CJ449', 'Project (Honours Programme)'),
  ('PHY', 8, 'PHY8CJ499', 'Project (Honours with Research Programme)'),
  ('PHY', 8, 'PHY8CJ489', 'Principles of Research Methodology'),
  ('PHY', 5, 'PHY5EJ301(1)', 'Properties of Solids'),
  ('PHY', 5, 'PHY5EJ302(1)', 'Materials Science'),
  ('PHY', 5, 'PHY5EJ303(2)', 'Photonics'),
  ('PHY', 5, 'PHY5EJ304(2)', 'Introductory Molecular Spectroscopy'),
  ('PHY', 5, 'PHY5EJ305(3)', 'Physics of Human Body'),
  ('PHY', 5, 'PHY5EJ306(3)', 'Introductory Medical Physics'),
  ('PHY', 5, 'PHY5EJ307(4)', 'Foundations of Data Science'),
  ('PHY', 5, 'PHY5EJ308(4)', 'Exploratory Data Analysis using Python'),
  ('PHY', 6, 'PHY6EJ301(1)', 'Nanoscience and Technology'),
  ('PHY', 6, 'PHY6EJ302(1)', 'Optoelectronics and Semiconductor Devices'),
  ('PHY', 6, 'PHY6EJ303(2)', 'Biophotonics'),
  ('PHY', 6, 'PHY6EJ305(3)', 'Introductory Biophysics'),
  ('PHY', 6, 'PHY6EJ306(3)', 'Applied Nuclear Physics'),
  ('PHY', 6, 'PHY6EJ307(4)', 'Foundations of Artificial Intelligence'),
  ('PHY', 6, 'PHY6EJ308(4)', 'Machine Learning Using Python'),
  ('PHY', 5, 'PHY5EJ309', 'Astrophysics'),
  ('PHY', 6, 'PHY6EJ309', 'Space Physics'),
  ('PHY', 6, 'PHY6EJ310', 'Atmospheric Physics'),
  ('PHY', 8, 'PHY8EJ401', 'Quantum Computation and Quantum Information'),
  ('PHY', 8, 'PHY8EJ402', 'Artificial Intelligence and Machine Learning in Physics'),
  ('PHY', 8, 'PHY8EJ403', 'Digital Signal Processing'),
  ('PHY', 8, 'PHY8EJ404', 'Digital Electronics'),
  ('PHY', 8, 'PHY8EJ405', 'Communication Electronics'),
  ('PHY', 8, 'PHY8EJ406', 'Plasma Physics'),
  ('PHY', 8, 'PHY8EJ407', 'Nonlinear Dynamics and Chaos'),
  ('PHY', 8, 'PHY8EJ408', 'Introductory General Relativity'),
  ('PHY', 8, 'PHY8EJ409', 'Introductory Quantum Field Theory'),
  ('PHY', 8, 'PHY8EJ410', 'Nuclear Physics'),
  ('MATH', 1, 'MAT1CJ101', 'Differential Calculus'),
  ('MATH', 2, 'MAT2CJ101', 'Integral Calculus'),
  ('MATH', 3, 'MAT3CJ201', 'Multivariable Calculus'),
  ('MATH', 3, 'MAT3CJ202', 'Matrix Algebra'),
  ('MATH', 4, 'MAT4CJ203', 'Real Analysis I'),
  ('MATH', 4, 'MAT4CJ204', 'Basic Linear Algebra'),
  ('MATH', 4, 'MAT4CJ205', 'Fundamentals of Python and SageMath'),
  ('MATH', 5, 'MAT5CJ301', 'Real Analysis II'),
  ('MATH', 5, 'MAT5CJ302', 'Abstract Algebra I'),
  ('MATH', 5, 'MAT5CJ303', 'Complex Analysis I'),
  ('MATH', 6, 'MAT6CJ304', 'Complex Analysis II'),
  ('MATH', 6, 'MAT6CJ305', 'Elementary Number Theory'),
  ('MATH', 6, 'MAT6CJ306', 'Methods of Differential Equations'),
  ('MATH', 6, 'MAT6CJ349', 'Internship in Major'),
  ('MATH', 6, 'MAT6FS113(1)', 'Data Science with Python'),
  ('MATH', 6, 'MAT6FS113(2)', 'Scientific Principles & Practice'),
  ('MATH', 7, 'MAT7CJ401', 'Mathematical Analysis'),
  ('MATH', 7, 'MAT7CJ402', 'General Topology'),
  ('MATH', 7, 'MAT7CJ403', 'Abstract Algebra II'),
  ('MATH', 7, 'MAT7CJ404', 'Linear Algebra'),
  ('MATH', 7, 'MAT7CJ405', 'Discrete Mathematics'),
  ('MATH', 8, 'MAT8CJ406', 'Basic Measure Theory'),
  ('MATH', 8, 'MAT8CJ407', 'Number Theory'),
  ('MATH', 8, 'MAT8CJ408', 'Differential Equations'),
  ('MATH', 8, 'MAT8CJ449', 'Project (Honours Programme)'),
  ('MATH', 8, 'MAT8CJ499', 'Project (Honours with Research Programme)'),
  ('MATH', 8, 'MAT8CJ489', 'Research Methodology in Mathematics'),
  ('MATH', 5, 'MAT5EJ301(1)', 'Mathematical Foundations of Computing'),
  ('MATH', 5, 'MAT5EJ302(1)', 'Data Structures and Algorithms'),
  ('MATH', 5, 'MAT5EJ303(2)', 'Convex Optimization'),
  ('MATH', 5, 'MAT5EJ304(2)', 'Machine Learning I'),
  ('MATH', 6, 'MAT6EJ301(1)', 'Numerical Analysis'),
  ('MATH', 6, 'MAT6EJ302(1)', 'Mathematics for Digital Images'),
  ('MATH', 6, 'MAT6EJ303(2)', 'Applied Probability'),
  ('MATH', 6, 'MAT6EJ304(2)', 'Machine Learning II'),
  ('MATH', 5, 'MAT5EJ305', 'Higher Algebra'),
  ('MATH', 5, 'MAT5EJ306', 'Linear Programming'),
  ('MATH', 6, 'MAT6EJ305', 'Topology of Metric Spaces'),
  ('MATH', 6, 'MAT6EJ306', 'Introduction to Fourier Analysis'),
  ('MATH', 8, 'MAT8EJ401', 'Advanced Topology'),
  ('MATH', 8, 'MAT8EJ402', 'Partial Differential Equations'),
  ('MATH', 8, 'MAT8EJ403', 'Rings and Modules'),
  ('MATH', 8, 'MAT8EJ404', 'Coding Theory'),
  ('MATH', 8, 'MAT8EJ405', 'Axiomatic Foundations of Mathematics'),
  ('MATH', 8, 'MAT8EJ406', 'Operations Research'),
  ('MATH', 8, 'MAT8EJ407', 'Cryptography'),
  ('MATH', 8, 'MAT8EJ408', 'Introduction to Fractals'),
  ('CHEM', 1, 'CHE1CJ101', 'Inorganic Chemistry - I'),
  ('CHEM', 2, 'CHE2CJ101', 'Physical Chemistry - I: States of Matter'),
  ('CHEM', 3, 'CHE3CJ201', 'Theoretical Chemistry - I: Basic Quantum Chemistry'),
  ('CHEM', 3, 'CHE3CJ202', 'Organic Chemistry - I'),
  ('CHEM', 4, 'CHE4CJ203', 'Inorganic Chemistry - II'),
  ('CHEM', 4, 'CHE4CJ204', 'Organic Chemistry - II'),
  ('CHEM', 4, 'CHE4CJ205', 'Physical Chemistry - II: Chemical Thermodynamics, Kinetics & Surface Chemistry'),
  ('CHEM', 5, 'CHE5CJ301', 'Theoretical Chemistry - II: Group Theory and Molecular Spectroscopy'),
  ('CHEM', 5, 'CHE5CJ302', 'Inorganic Chemistry - III'),
  ('CHEM', 5, 'CHE5CJ303', 'Organic Chemistry - III'),
  ('CHEM', 6, 'CHE6CJ304', 'Inorganic Chemistry - IV'),
  ('CHEM', 6, 'CHE6CJ305', 'Organic Chemistry - IV'),
  ('CHEM', 6, 'CHE6CJ306', 'Physical Chemistry - III: Chemical and Phase Equilibria, Electrochemistry and Photochemistry'),
  ('CHEM', 6, 'CHE6CJ349', 'Internship in Major'),
  ('CHEM', 7, 'CHE7CJ401', 'Theoretical Chemistry - III: Advanced Quantum Chemistry'),
  ('CHEM', 7, 'CHE7CJ402', 'Inorganic Chemistry - V'),
  ('CHEM', 7, 'CHE7CJ403', 'Organic Chemistry - V'),
  ('CHEM', 7, 'CHE7CJ404', 'Physical Chemistry - IV: Statistical Thermodynamics'),
  ('CHEM', 7, 'CHE7CJ405', 'Instrumental Methods of Analysis'),
  ('CHEM', 8, 'CHE8CJ406', 'Inorganic Chemistry - VI'),
  ('CHEM', 8, 'CHE8CJ407', 'Organic Chemistry - VI'),
  ('CHEM', 8, 'CHE8CJ408', 'Physical Chemistry - V: Advanced Topics in Solid State and Electrochemistry'),
  ('CHEM', 8, 'CHE8CJ449', 'Project (Honours Programme)'),
  ('CHEM', 8, 'CHE8CJ499', 'Research Project (Honours with Research Programme)'),
  ('CHEM', 8, 'CHE8CJ489', 'Research Methodology in Chemistry'),
  ('CHEM', 5, 'CHE5EJ301', 'Green Chemistry'),
  ('CHEM', 5, 'CHE5EJ302', 'Nanoscience and Nanotechnology'),
  ('CHEM', 5, 'CHE5EJ303', 'Bio Co-ordination Chemistry'),
  ('CHEM', 5, 'CHE5EJ304', 'Food Chemistry'),
  ('CHEM', 6, 'CHE6EJ311', 'Polymer Chemistry'),
  ('CHEM', 6, 'CHE6EJ312', 'Industrial Chemistry'),
  ('CHEM', 6, 'CHE6EJ313', 'Advanced Energy Materials'),
  ('CHEM', 6, 'CHE6EJ314', 'Material Science'),
  ('CHEM', 8, 'CHE8EJ409', 'Industrial Catalysis'),
  ('CHEM', 8, 'CHE8EJ410', 'Advanced Organic Chemistry'),
  ('CHEM', 8, 'CHE8EJ411', 'Modern Organic Synthesis'),
  ('CHEM', 8, 'CHE8EJ412', 'Computational Chemistry'),
  ('CHEM', 8, 'CHE8EJ413', 'Petrochemicals and Cosmetics'),
  ('CHEM', 8, 'CHE8EJ414', 'Advanced Topics in Inorganic Chemistry'),
  ('BOT', 1, 'BOT1CJ101', 'Aesthetic Botany'),
  ('BOT', 2, 'BOT2CJ101', 'Microbial Diversity & Phyto-Pathology'),
  ('BOT', 3, 'BOT3CJ201', 'Plant Embryology, Palynology & Evolution'),
  ('BOT', 3, 'BOT3CJ202', 'Plant Anatomy & Analytical Techniques'),
  ('BOT', 4, 'BOT4CJ203', 'Plant Diversity I'),
  ('BOT', 4, 'BOT4CJ204', 'Phytochemistry & Pharmacognosy'),
  ('BOT', 4, 'BOT4CJ205', 'Cell & Molecular Biology'),
  ('BOT', 5, 'BOT5CJ301', 'Plant Diversity II'),
  ('BOT', 5, 'BOT5CJ302', 'Angiosperm Morphology, Systematics & Plant Resources'),
  ('BOT', 5, 'BOT5CJ303', 'Genetics, Plant Breeding & Palaeobotany'),
  ('BOT', 6, 'BOT6CJ304', 'Plant Physiology & Metabolism'),
  ('BOT', 6, 'BOT6CJ305', 'Plant Biotechnology, Nanotechnology & Bioinformatics'),
  ('BOT', 6, 'BOT6CJ306', 'Environmental Science & Phytogeography'),
  ('BOT', 6, 'BOT6CJ349', 'Internship in Major'),
  ('BOT', 6, 'BOT6FS113(1)', 'Phytochemical Techniques'),
  ('BOT', 6, 'BOT6FS113(2)', 'Essential Oils & Perfumery'),
  ('BOT', 6, 'BOT6FS113(3)', 'Seaweed Farming'),
  ('BOT', 7, 'BOT7CJ401', 'Advances in Microbiology & Thallophytes'),
  ('BOT', 7, 'BOT7CJ402', 'Advances in Archegoniates'),
  ('BOT', 7, 'BOT7CJ403', 'Advanced Plant Systematics'),
  ('BOT', 7, 'BOT7CJ404', 'Advanced Cell & Molecular Biology'),
  ('BOT', 7, 'BOT7CJ405', 'Multi-omics Approach in Biology'),
  ('BOT', 8, 'BOT8CJ406', 'Geobotanical Mapping & Sustainable Development'),
  ('BOT', 8, 'BOT8CJ407', 'Crop Improvement & Plant Pathology'),
  ('BOT', 8, 'BOT8CJ408', 'Smart Farming'),
  ('BOT', 8, 'BOT8CJ449', 'Project (Honours Programme)'),
  ('BOT', 8, 'BOT8CJ499', 'Project (Honours with Research Programme)'),
  ('BOT', 8, 'BOT8CJ489', 'Research Methodology in Botany'),
  ('BOT', 5, 'BOT5EJ301(1)', 'Conservation Biology'),
  ('BOT', 5, 'BOT5EJ302(1)', 'Environmental Monitoring & Disaster Management'),
  ('BOT', 5, 'BOT5EJ303(2)', 'Plant Resource Utilisation & Bioprospecting'),
  ('BOT', 5, 'BOT5EJ304(2)', 'Indigenous Plant Science & Forestry'),
  ('BOT', 6, 'BOT6EJ301(1)', 'Climate Change & Ecosystem Management'),
  ('BOT', 6, 'BOT6EJ302(1)', 'Invasive Plant Ecology'),
  ('BOT', 6, 'BOT6EJ303(2)', 'Plant Nanotechnology'),
  ('BOT', 6, 'BOT6EJ304(2)', 'Botanical Entrepreneurship'),
  ('BOT', 5, 'BOT5EJ305', 'Plantation Science & Wood Technology'),
  ('BOT', 6, 'BOT6EJ305', 'Forensic Botany'),
  ('BOT', 8, 'BOT8EJ401', 'Artificial Intelligence in Plant Science'),
  ('BOT', 8, 'BOT8EJ402', 'Computational Biology & Data Analysis'),
  ('BOT', 8, 'BOT8EJ403', 'Industrial Biotechnology & Plant Genetic Engineering'),
  ('BOT', 8, 'BOT8EJ404', 'Angiosperm Anatomy, Developmental Botany & Palynology'),
  ('BOT', 8, 'BOT8EJ405', 'Advanced Plant Physiology & Metabolism'),
  ('BOT', 8, 'BOT8EJ406', 'Genetics & Cancer Biology'),
  ('BOT', 8, 'BOT8EJ407', 'Instrumentation Biology'),
  ('BOT', 8, 'BOT8EJ408', 'Biosafety, IPR & Patenting')
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
