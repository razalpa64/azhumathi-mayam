-- ============================================================================
-- 0002 — Student Requests + Short Notes / Cheat Sheets categories
-- 1. Two new resource categories power the "Short Notes & Exam Special"
--    section: admins publish to them via the normal Upload flow.
-- 2. resource_requests: students ask for notes/papers; admins answer from
--    the admin panel (status + note), students track status in-app.
-- ============================================================================

-- 1. Short Notes & Cheat Sheets categories ------------------------------------
INSERT INTO public.resource_categories (name, slug, description, icon_name, is_question_paper, display_order)
VALUES
  ('Short Notes', 'short-notes', 'Quick revision short notes — the night-before-the-exam read.', 'NotebookPen', false, 13),
  ('Cheat Sheets', 'cheat-sheets', 'One-page formula sheets, charts and last-minute cheat sheets.', 'Zap', false, 14)
ON CONFLICT (slug) DO NOTHING;

-- 2. Student requests ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'notes'
    CHECK (request_type IN ('notes', 'question_paper', 'short_notes', 'cheat_sheet', 'syllabus', 'other')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  subject_text TEXT CHECK (char_length(subject_text) <= 160),
  details TEXT CHECK (char_length(details) <= 1500),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'rejected')),
  admin_note TEXT CHECK (char_length(admin_note) <= 1000),
  fulfilled_resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_requests_student
  ON public.resource_requests(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_status
  ON public.resource_requests(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_resource_requests_updated_at ON public.resource_requests;
CREATE TRIGGER trg_resource_requests_updated_at
  BEFORE UPDATE ON public.resource_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.resource_requests ENABLE ROW LEVEL SECURITY;

-- Students: read + create their own requests (and only while active)
DROP POLICY IF EXISTS "resource_requests_select_own" ON public.resource_requests;
CREATE POLICY "resource_requests_select_own" ON public.resource_requests
  FOR SELECT TO authenticated
  USING ((student_id = auth.uid() AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "resource_requests_insert_own" ON public.resource_requests;
CREATE POLICY "resource_requests_insert_own" ON public.resource_requests
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.is_active_user());

-- Admin: full control (answer, change status, delete spam)
DROP POLICY IF EXISTS "resource_requests_admin_all" ON public.resource_requests;
CREATE POLICY "resource_requests_admin_all" ON public.resource_requests
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
