-- ============================================================================
-- 0004 — Student group chat (one shared "everyone" room)
-- WhatsApp-group style: every signed-in student reads and posts in the
-- same room. To keep storage at ~zero, messages live for ONE day
-- (Asia/Kolkata): the app only ever reads today's rows, and yesterday's
-- rows are deleted opportunistically on chat reads/writes plus by the
-- /api/cron/chat-cleanup endpoint. The table stays tiny forever.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created
  ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user
  ON public.chat_messages(user_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read the room (the app scopes reads to "today")
DROP POLICY IF EXISTS "chat_read" ON public.chat_messages;
CREATE POLICY "chat_read" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);

-- You can only post as yourself
DROP POLICY IF EXISTS "chat_insert_own" ON public.chat_messages;
CREATE POLICY "chat_insert_own" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- You can only delete your own messages
DROP POLICY IF EXISTS "chat_delete_own" ON public.chat_messages;
CREATE POLICY "chat_delete_own" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Stream new/removed messages to subscribed clients (Supabase Realtime).
-- Guarded so re-running the migration (or a non-Supabase Postgres) is safe.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
