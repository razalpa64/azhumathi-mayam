import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ChatClient } from '@/components/student/ChatClient';
import { CHAT_FETCH_LIMIT, CHAT_SELECT, getIstDayStartIso } from '@/lib/chat';
import type { ChatMessage } from '@/types/database';

export const metadata = {
  title: 'Group Chat',
};

export default async function GroupChatPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('chat_messages')
    .select(CHAT_SELECT)
    .gte('created_at', getIstDayStartIso())
    .order('created_at', { ascending: false })
    .limit(CHAT_FETCH_LIMIT);

  const initialMessages = (
    !error && data ? [...data].reverse() : []
  ) as unknown as ChatMessage[];

  return (
    <div className="anim-rise mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-charcoal">Group chat</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          One room for every student — ask a doubt, share a note, find who else is awake
          before the exam. It starts fresh every morning.
        </p>
      </div>

      <ChatClient
        initialMessages={initialMessages}
        currentUserId={profile.id}
        unavailable={Boolean(error)}
      />
    </div>
  );
}
