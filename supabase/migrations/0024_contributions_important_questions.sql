-- =====================================================================
-- Azhumathi Mayam — Student contributions + important questions (0024)
--
-- Two additive features; nothing existing is altered:
--
-- 1. material_submissions — students contribute study materials the
--    same way admins add them (a Google Drive sharing link), but the
--    row lands as 'pending' and only becomes a real resource when a
--    staff member approves it (the approval inserts into resources
--    with uploaded_by = the student, and remembers the created row in
--    created_resource_id). Powers the Top Contributors leaderboard
--    (approved submissions per student).
--
-- 2. important_questions — staff-curated "most repeated questions"
--    per subject: the question text, which module it belongs to, the
--    years it was asked and how many times it has appeared. Students
--    read them; only staff write them.
--
-- Safe to run more than once in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Student material submissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  google_drive_share_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'PDF'
    CHECK (file_type IN ('PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'ZIP', 'OTHER')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_submissions_status
  ON public.material_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_submissions_student
  ON public.material_submissions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_submissions_leaderboard
  ON public.material_submissions (student_id) WHERE status = 'approved';

DROP TRIGGER IF EXISTS trg_material_submissions_updated_at ON public.material_submissions;
CREATE TRIGGER trg_material_submissions_updated_at
  BEFORE UPDATE ON public.material_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.material_submissions ENABLE ROW LEVEL SECURITY;

-- Students read their own submissions; staff read everything.
DROP POLICY IF EXISTS "material_submissions_select" ON public.material_submissions;
CREATE POLICY "material_submissions_select" ON public.material_submissions
  FOR SELECT TO authenticated
  USING ((student_id = auth.uid() AND public.is_active_user()) OR public.is_staff());

-- Students create only their own, always as 'pending'.
DROP POLICY IF EXISTS "material_submissions_insert_own" ON public.material_submissions;
CREATE POLICY "material_submissions_insert_own" ON public.material_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND public.is_active_user()
  );

-- Students may withdraw (delete) their own still-pending submission.
DROP POLICY IF EXISTS "material_submissions_delete_own_pending" ON public.material_submissions;
CREATE POLICY "material_submissions_delete_own_pending" ON public.material_submissions
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() AND status = 'pending');

-- Staff moderate (approve / reject).
DROP POLICY IF EXISTS "material_submissions_staff_update" ON public.material_submissions;
CREATE POLICY "material_submissions_staff_update" ON public.material_submissions
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "material_submissions_staff_delete" ON public.material_submissions;
CREATE POLICY "material_submissions_staff_delete" ON public.material_submissions
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ---------------------------------------------------------------------
-- 2. Important / most-repeated questions per subject
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.important_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  module TEXT,
  topic TEXT,
  years_asked TEXT,
  times_asked INTEGER NOT NULL DEFAULT 1 CHECK (times_asked >= 1),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_important_questions_subject
  ON public.important_questions (subject_id, times_asked DESC, created_at DESC);

DROP TRIGGER IF EXISTS trg_important_questions_updated_at ON public.important_questions;
CREATE TRIGGER trg_important_questions_updated_at
  BEFORE UPDATE ON public.important_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.important_questions ENABLE ROW LEVEL SECURITY;

-- Every signed-in student can read them.
DROP POLICY IF EXISTS "important_questions_select" ON public.important_questions;
CREATE POLICY "important_questions_select" ON public.important_questions
  FOR SELECT TO authenticated
  USING (public.is_active_user());

-- Only staff add / edit / remove them.
DROP POLICY IF EXISTS "important_questions_staff_write" ON public.important_questions;
CREATE POLICY "important_questions_staff_write" ON public.important_questions
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
