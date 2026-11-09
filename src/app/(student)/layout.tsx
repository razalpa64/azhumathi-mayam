import type { Metadata } from 'next';
import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeCount } from '@/lib/supabase/safe-count';
import { StudentShell } from '@/components/student/StudentShell';

// Signed-in student pages must never be indexed (the public landing
// page at / is the search-facing entry point).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const unreadCount = await safeCount(
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
  );

  return (
    <StudentShell profile={profile} unreadNotifications={unreadCount}>
      {children}
    </StudentShell>
  );
}
