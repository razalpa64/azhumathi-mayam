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
    <div className="anim-rise mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col lg:max-w-4xl xl:max-w-5xl">
      <h1 className="sr-only">Group chat</h1>
      <ChatClient
        initialMessages={initialMessages}
        currentUserId={profile.id}
        unavailable={Boolean(error)}
      />
    </div>
  );
}
