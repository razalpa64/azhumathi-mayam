-- ============================================================================
-- 0012 - Sub-administrators (content managers)
-- ----------------------------------------------------------------------------
-- The super administrator (username admin@invytra, role 'admin') can now
-- create SUB-ADMIN accounts (role 'sub_admin') for people who help run
-- the library. A sub-admin can:
--   * upload and manage study materials (notes, question papers, ...),
--   * manage the academic catalogue (universities, programmes,
--     specializations, regulations, semesters, subjects, categories),
--   * read and answer student resource requests.
-- A sub-admin can NOT:
--   * see or manage student accounts, create/delete any account
--     (including other sub-admins), change site settings, post notices,
--     manage advertisements, or read the audit log.
--
-- Enforcement is layered:
--   1. App/API guards (primary): requireApiStaff admits admin+sub_admin
--      on content routes; requireApiAdmin (admin only) stays on student,
--      team, notices, advertisements and settings routes, and every
--      admin page re-checks its own tier server-side.
--   2. RLS (this migration, defence in depth): the content tables'
--      write policies move from is_admin() to the new is_staff(), and
--      their read policies likewise, so a sub-admin's own database
--      session can work with drafts. profiles / notices /
--      advertisements / admin_activity_logs / website_settings policies
--      deliberately stay is_admin() only — a sub-admin's session can
--      never read another user's profile row or an audit entry.
--   3. The protect_profile_sensitive_columns trigger already blocks any
--      non-admin (including sub-admins) from changing roles, usernames
--      or active flags through a profile update.
--
-- profiles.created_by records which super admin created a sub-admin
-- account (NULL for students and the super admin itself).
--
-- Idempotent: safe to run repeatedly.
-- ============================================================================

-- 1. Allow the new role + record who created a sub-admin ----------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'sub_admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles (created_by);

-- 2. Staff helper (super admin OR sub-admin, active accounts only) ------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'sub_admin')
      AND is_active = true
  );
$$;

-- 3. Content-table policies: staff may read (incl. drafts) and write ----
-- Universities
DROP POLICY IF EXISTS "universities_read_active" ON public.universities;
CREATE POLICY "universities_read_active" ON public.universities
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "universities_admin_all" ON public.universities;
DROP POLICY IF EXISTS "universities_staff_all" ON public.universities;
CREATE POLICY "universities_staff_all" ON public.universities
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Programmes
DROP POLICY IF EXISTS "programmes_read_active" ON public.programmes;
CREATE POLICY "programmes_read_active" ON public.programmes
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "programmes_admin_all" ON public.programmes;
DROP POLICY IF EXISTS "programmes_staff_all" ON public.programmes;
CREATE POLICY "programmes_staff_all" ON public.programmes
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Specializations
DROP POLICY IF EXISTS "specializations_read_active" ON public.specializations;
CREATE POLICY "specializations_read_active" ON public.specializations
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "specializations_admin_all" ON public.specializations;
DROP POLICY IF EXISTS "specializations_staff_all" ON public.specializations;
CREATE POLICY "specializations_staff_all" ON public.specializations
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Academic regulations
DROP POLICY IF EXISTS "regulations_read_active" ON public.academic_regulations;
CREATE POLICY "regulations_read_active" ON public.academic_regulations
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "regulations_admin_all" ON public.academic_regulations;
DROP POLICY IF EXISTS "regulations_staff_all" ON public.academic_regulations;
CREATE POLICY "regulations_staff_all" ON public.academic_regulations
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Semesters
DROP POLICY IF EXISTS "semesters_read_active" ON public.semesters;
CREATE POLICY "semesters_read_active" ON public.semesters
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "semesters_admin_all" ON public.semesters;
DROP POLICY IF EXISTS "semesters_staff_all" ON public.semesters;
CREATE POLICY "semesters_staff_all" ON public.semesters
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Subjects
DROP POLICY IF EXISTS "subjects_read_published" ON public.subjects;
CREATE POLICY "subjects_read_published" ON public.subjects
  FOR SELECT TO authenticated
  USING ((publication_status = 'published' AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_staff_all" ON public.subjects;
CREATE POLICY "subjects_staff_all" ON public.subjects
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Resource categories
DROP POLICY IF EXISTS "categories_read_active" ON public.resource_categories;
CREATE POLICY "categories_read_active" ON public.resource_categories
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "categories_admin_all" ON public.resource_categories;
DROP POLICY IF EXISTS "categories_staff_all" ON public.resource_categories;
CREATE POLICY "categories_staff_all" ON public.resource_categories
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Resources (study materials)
DROP POLICY IF EXISTS "resources_read_published" ON public.resources;
CREATE POLICY "resources_read_published" ON public.resources
  FOR SELECT TO authenticated
  USING ((publication_status = 'published' AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "resources_admin_all" ON public.resources;
DROP POLICY IF EXISTS "resources_staff_all" ON public.resources;
CREATE POLICY "resources_staff_all" ON public.resources
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Student resource requests (sub-admins answer these)
DROP POLICY IF EXISTS "resource_requests_select_own" ON public.resource_requests;
CREATE POLICY "resource_requests_select_own" ON public.resource_requests
  FOR SELECT TO authenticated
  USING ((student_id = auth.uid() AND public.is_active_user()) OR public.is_staff());

DROP POLICY IF EXISTS "resource_requests_admin_all" ON public.resource_requests;
DROP POLICY IF EXISTS "resource_requests_staff_all" ON public.resource_requests;
CREATE POLICY "resource_requests_staff_all" ON public.resource_requests
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
