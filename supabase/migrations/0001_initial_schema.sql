-- ============================================================================
-- അഴിമതി മയം — Production PostgreSQL Schema & Row Level Security
-- Migration: 0001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- Updated-at trigger function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. UNIVERSITIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL UNIQUE,
  location TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_universities_updated_at ON public.universities;
CREATE TRIGGER trg_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 2. PROGRAMMES (Degrees: B.Tech, BCA, BBA, B.Com, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_title TEXT,
  degree_level TEXT NOT NULL DEFAULT 'UG' CHECK (degree_level IN ('UG', 'PG', 'Diploma', 'Doctoral')),
  total_semesters INTEGER NOT NULL DEFAULT 6 CHECK (total_semesters BETWEEN 1 AND 16),
  has_specializations BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_programmes_updated_at ON public.programmes;
CREATE TRIGGER trg_programmes_updated_at
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3. SPECIALIZATIONS (Branches / Streams, e.g., CSE, AI & ML, ECE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_specialization_programme_code UNIQUE (programme_id, code)
);

DROP TRIGGER IF EXISTS trg_specializations_updated_at ON public.specializations;
CREATE TRIGGER trg_specializations_updated_at
  BEFORE UPDATE ON public.specializations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. ACADEMIC REGULATIONS / SCHEMES / BATCHES (e.g., 2019 Scheme, 2024 Scheme)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  batch_range TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_academic_regulations_updated_at ON public.academic_regulations;
CREATE TRIGGER trg_academic_regulations_updated_at
  BEFORE UPDATE ON public.academic_regulations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 5. SEMESTERS (Configurable per programme)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 16),
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_semester_programme_num UNIQUE (programme_id, semester_number)
);

DROP TRIGGER IF EXISTS trg_semesters_updated_at ON public.semesters;
CREATE TRIGGER trg_semesters_updated_at
  BEFORE UPDATE ON public.semesters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. PROFILES (Students & Super Administrator)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  auth_email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  avatar_url TEXT,
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  specialization_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
  regulation_id UUID REFERENCES public.academic_regulations(id) ON DELETE SET NULL,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_programme_sem ON public.profiles (programme_id, semester_id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper role functions (SECURITY DEFINER to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

-- Prevent privilege escalation on profile updates by non-admin users
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: role cannot be modified';
    END IF;
    IF NEW.username IS DISTINCT FROM OLD.username THEN
      RAISE EXCEPTION 'Unauthorized: username cannot be modified';
    END IF;
    IF NEW.auth_email IS DISTINCT FROM OLD.auth_email THEN
      RAISE EXCEPTION 'Unauthorized: auth_email cannot be modified';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Unauthorized: account active status cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- ----------------------------------------------------------------------------
-- 7. SUBJECTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  specialization_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
  regulation_id UUID REFERENCES public.academic_regulations(id) ON DELETE SET NULL,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_lookup ON public.subjects (programme_id, semester_id, specialization_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects (upper(subject_code));
CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm ON public.subjects USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 8. RESOURCE CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'FileText',
  is_question_paper BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_resource_categories_updated_at ON public.resource_categories;
CREATE TRIGGER trg_resource_categories_updated_at
  BEFORE UPDATE ON public.resource_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 9. RESOURCES (Google Drive Sharing-Link Storage Reference Architecture)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
  specialization_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
  regulation_id UUID REFERENCES public.academic_regulations(id) ON DELETE SET NULL,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.resource_categories(id) ON DELETE RESTRICT,
  academic_year TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  storage_provider TEXT NOT NULL DEFAULT 'google_drive_link',
  google_drive_file_id TEXT NOT NULL,
  google_drive_share_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT NOT NULL DEFAULT 'PDF' CHECK (file_type IN ('PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'ZIP', 'OTHER')),
  file_size TEXT,
  download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published')),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_published_hierarchy
  ON public.resources (publication_status, programme_id, semester_id, specialization_id);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources (subject_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources (category_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_resources_created ON public.resources (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_downloads ON public.resources (download_count DESC);
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm ON public.resources USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_keywords ON public.resources USING gin (keywords);

DROP TRIGGER IF EXISTS trg_resources_updated_at ON public.resources;
CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 10. NOTICES / ANNOUNCEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  notice_type TEXT NOT NULL DEFAULT 'general'
    CHECK (notice_type IN ('general', 'exam', 'assignment', 'academic_update', 'material_update', 'college')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'pdf', 'drive')),
  attachment_name TEXT,
  external_link TEXT,
  external_link_label TEXT,
  target_programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_active
  ON public.notices (publication_status, is_pinned DESC, priority, start_date DESC);

DROP TRIGGER IF EXISTS trg_notices_updated_at ON public.notices;
CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 11. BOOKMARKS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_bookmark_user_resource UNIQUE (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 12. RECENTLY VIEWED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_recently_viewed_user_resource UNIQUE (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON public.recently_viewed (user_id, viewed_at DESC);

-- ----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'notice'
    CHECK (notification_type IN ('notice', 'resource', 'account', 'system')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 14. DOWNLOADS (Deduplicated download log + atomic counter RPC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dedupe_bucket TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_downloads_dedupe UNIQUE (user_id, resource_id, dedupe_bucket)
);

CREATE INDEX IF NOT EXISTS idx_downloads_resource ON public.downloads (resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON public.downloads (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_resource_download(
  p_resource_id UUID,
  p_user_id UUID,
  p_dedupe_bucket TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
BEGIN
  INSERT INTO public.downloads (resource_id, user_id, dedupe_bucket, user_agent)
  VALUES (p_resource_id, p_user_id, p_dedupe_bucket, p_user_agent)
  ON CONFLICT (user_id, resource_id, dedupe_bucket) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    UPDATE public.resources
    SET download_count = download_count + 1
    WHERE id = p_resource_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 15. ADVERTISEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN (
    'homepage_banner',
    'between_listings',
    'subject_page',
    'below_pdf_preview',
    'dedicated_partner_section'
  )),
  provider_type TEXT NOT NULL DEFAULT 'custom_sponsor' CHECK (provider_type IN ('custom_sponsor', 'adsense_slot')),
  sponsor_name TEXT,
  headline TEXT,
  body_text TEXT,
  cta_label TEXT,
  target_url TEXT,
  image_url TEXT,
  adsense_client_id TEXT,
  adsense_slot_id TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON public.advertisements (placement, is_enabled);

DROP TRIGGER IF EXISTS trg_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER trg_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 16. ADMIN ACTIVITY LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON public.admin_activity_logs (created_at DESC);

-- ----------------------------------------------------------------------------
-- 17. WEBSITE SETTINGS (Singleton)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_name TEXT NOT NULL DEFAULT 'അഴിമതി മയം',
  notices_enabled BOOLEAN NOT NULL DEFAULT true,
  ads_enabled BOOLEAN NOT NULL DEFAULT false,
  adsense_publisher_id TEXT,
  require_ad_consent BOOLEAN NOT NULL DEFAULT false,
  allow_cross_programme_browsing BOOLEAN NOT NULL DEFAULT true,
  storage_provider TEXT NOT NULL DEFAULT 'google_drive_link',
  support_email TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.website_settings (id, platform_name, notices_enabled, ads_enabled, storage_provider)
VALUES (1, 'അഴിമതി മയം', true, false, 'google_drive_link')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((id = auth.uid() AND is_active = true) OR public.is_admin())
  WITH CHECK ((id = auth.uid() AND is_active = true) OR public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Academic Taxonomy Read (Authenticated Active Users) + Admin Full Write
DROP POLICY IF EXISTS "universities_read_active" ON public.universities;
CREATE POLICY "universities_read_active" ON public.universities
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "universities_admin_all" ON public.universities;
CREATE POLICY "universities_admin_all" ON public.universities
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "programmes_read_active" ON public.programmes;
CREATE POLICY "programmes_read_active" ON public.programmes
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "programmes_admin_all" ON public.programmes;
CREATE POLICY "programmes_admin_all" ON public.programmes
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "specializations_read_active" ON public.specializations;
CREATE POLICY "specializations_read_active" ON public.specializations
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "specializations_admin_all" ON public.specializations;
CREATE POLICY "specializations_admin_all" ON public.specializations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "regulations_read_active" ON public.academic_regulations;
CREATE POLICY "regulations_read_active" ON public.academic_regulations
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "regulations_admin_all" ON public.academic_regulations;
CREATE POLICY "regulations_admin_all" ON public.academic_regulations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "semesters_read_active" ON public.semesters;
CREATE POLICY "semesters_read_active" ON public.semesters
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "semesters_admin_all" ON public.semesters;
CREATE POLICY "semesters_admin_all" ON public.semesters
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subjects_read_published" ON public.subjects;
CREATE POLICY "subjects_read_published" ON public.subjects
  FOR SELECT TO authenticated
  USING ((publication_status = 'published' AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
CREATE POLICY "subjects_admin_all" ON public.subjects
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_read_active" ON public.resource_categories;
CREATE POLICY "categories_read_active" ON public.resource_categories
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "categories_admin_all" ON public.resource_categories;
CREATE POLICY "categories_admin_all" ON public.resource_categories
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Resources: Strictly published-only for active authenticated students; full for admin
DROP POLICY IF EXISTS "resources_read_published" ON public.resources;
CREATE POLICY "resources_read_published" ON public.resources
  FOR SELECT TO authenticated
  USING ((publication_status = 'published' AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "resources_admin_all" ON public.resources;
CREATE POLICY "resources_admin_all" ON public.resources
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notices
DROP POLICY IF EXISTS "notices_read_active" ON public.notices;
CREATE POLICY "notices_read_active" ON public.notices
  FOR SELECT TO authenticated
  USING (
    (
      publication_status = 'published'
      AND start_date <= now()
      AND (expiry_date IS NULL OR expiry_date > now())
      AND public.is_active_user()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "notices_admin_all" ON public.notices;
CREATE POLICY "notices_admin_all" ON public.notices
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Bookmarks
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks
  FOR ALL TO authenticated
  USING ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin())
  WITH CHECK ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin());

-- Recently Viewed
DROP POLICY IF EXISTS "recently_viewed_own" ON public.recently_viewed;
CREATE POLICY "recently_viewed_own" ON public.recently_viewed
  FOR ALL TO authenticated
  USING ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin())
  WITH CHECK ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin())
  WITH CHECK ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "notifications_admin_write" ON public.notifications;
CREATE POLICY "notifications_admin_write" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Downloads
DROP POLICY IF EXISTS "downloads_select_own_or_admin" ON public.downloads;
CREATE POLICY "downloads_select_own_or_admin" ON public.downloads
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid() AND public.is_active_user()) OR public.is_admin());

DROP POLICY IF EXISTS "downloads_insert_own" ON public.downloads;
CREATE POLICY "downloads_insert_own" ON public.downloads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

-- Advertisements
DROP POLICY IF EXISTS "advertisements_read_enabled" ON public.advertisements;
CREATE POLICY "advertisements_read_enabled" ON public.advertisements
  FOR SELECT TO authenticated
  USING (
    (
      is_enabled = true
      AND (start_date IS NULL OR start_date <= now())
      AND (end_date IS NULL OR end_date > now())
      AND public.is_active_user()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "advertisements_admin_all" ON public.advertisements;
CREATE POLICY "advertisements_admin_all" ON public.advertisements
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin Activity Logs
DROP POLICY IF EXISTS "activity_logs_admin_only" ON public.admin_activity_logs;
CREATE POLICY "activity_logs_admin_only" ON public.admin_activity_logs
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Website Settings
DROP POLICY IF EXISTS "website_settings_read_auth" ON public.website_settings;
CREATE POLICY "website_settings_read_auth" ON public.website_settings
  FOR SELECT TO authenticated
  USING (public.is_active_user() OR public.is_admin());

DROP POLICY IF EXISTS "website_settings_admin_update" ON public.website_settings;
CREATE POLICY "website_settings_admin_update" ON public.website_settings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Supabase Storage Bucket for Profile Avatars & Notice Banner Images (NOT study material PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-media',
  'platform-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "platform_media_public_read" ON storage.objects;
CREATE POLICY "platform_media_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'platform-media');

DROP POLICY IF EXISTS "platform_media_avatar_upload" ON storage.objects;
CREATE POLICY "platform_media_avatar_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-media'
    AND (
      (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "platform_media_avatar_update" ON storage.objects;
CREATE POLICY "platform_media_avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'platform-media'
    AND (
      (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.is_admin()
    )
  );
