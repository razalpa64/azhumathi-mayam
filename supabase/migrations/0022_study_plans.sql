-- =====================================================================
-- Azhumathi Mayam — Exam study plans (0022)
--
-- One active plan per student: the exam date, how many minutes a day
-- they can study, which of their semester subjects are in the plan,
-- and which generated day-tasks they have ticked off (opaque keys of
-- the form "yyyy-mm-dd|subjectId|kind", produced by
-- src/lib/study-plan.ts). The day-by-day plan itself is generated
-- deterministically from these inputs, so it never needs storing.
--
-- Safe to run more than once in the Supabase SQL editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  daily_minutes INTEGER NOT NULL DEFAULT 120
    CHECK (daily_minutes BETWEEN 15 AND 720),
  subject_ids UUID[] NOT NULL DEFAULT '{}',
  completed_keys TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_plans_select_own" ON public.study_plans;
DROP POLICY IF EXISTS "study_plans_insert_own" ON public.study_plans;
DROP POLICY IF EXISTS "study_plans_update_own" ON public.study_plans;
DROP POLICY IF EXISTS "study_plans_delete_own" ON public.study_plans;

CREATE POLICY "study_plans_select_own" ON public.study_plans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "study_plans_insert_own" ON public.study_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "study_plans_update_own" ON public.study_plans
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "study_plans_delete_own" ON public.study_plans
  FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_study_plans_updated_at ON public.study_plans;
CREATE TRIGGER trg_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
