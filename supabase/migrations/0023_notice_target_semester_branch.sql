-- =====================================================================
-- Azhumathi Mayam — Notice targeting by semester & branch (0023)
--
-- Notices could already target a whole programme. This adds optional
-- semester and branch (specialization) targeting: when either is set,
-- the publish fan-out (in-app notifications + web push) goes only to
-- active students of that semester / branch, and the dashboard notice
-- board shows the notice only to them. NULL = no restriction, exactly
-- as before.
--
-- Safe to run more than once in the Supabase SQL editor.
-- =====================================================================

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS target_semester_id UUID
    REFERENCES public.semesters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_specialization_id UUID
    REFERENCES public.specializations(id) ON DELETE SET NULL;
