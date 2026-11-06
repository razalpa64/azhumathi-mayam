import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NotificationsClient } from '@/components/student/NotificationsClient';
import type { NotificationItem } from '@/types/database';

export const metadata = {
  title: 'Notifications',
};

export default async function NotificationsPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(60);

  return <NotificationsClient initialItems={(data || []) as NotificationItem[]} />;
}
