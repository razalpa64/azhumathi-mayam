-- ============================================================================
-- 0003 — Short Notes becomes a first-class hub on resource_categories
-- (same pattern as is_question_paper for the Question Papers hub):
--   * adds is_short_note flag + backfills it for the two categories
--   * guarantees Short Notes & Cheat Sheets exist and are active, so they
--     appear in Admin → Upload (Resource Category), Admin → Courses
--     (Resource Categories) and every student "Type" filter
-- Run 0001 -> 0002 -> 0003 (scripts/provision.ts does this for you).
-- ============================================================================

ALTER TABLE public.resource_categories
  ADD COLUMN IF NOT EXISTS is_short_note BOOLEAN NOT NULL DEFAULT false;

-- Create the two types if missing; if they already exist (from 0002),
-- switch their hub flag on and make sure they are visible.
INSERT INTO public.resource_categories
  (name, slug, description, icon_name, is_question_paper, is_short_note, display_order)
VALUES
  ('Short Notes', 'short-notes', 'Quick revision short notes — the night-before-the-exam read.', 'NotebookPen', false, true, 13),
  ('Cheat Sheets', 'cheat-sheets', 'One-page formula sheets, charts and last-minute cheat sheets.', 'Zap', false, true, 14)
ON CONFLICT (slug) DO UPDATE
  SET is_short_note = true,
      is_active = true;

-- Backfill by slug in case rows were created manually from the admin panel
UPDATE public.resource_categories
  SET is_short_note = true
  WHERE slug IN ('short-notes', 'cheat-sheets');
