import { requireStaffUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { safeCount } from '@/lib/supabase/safe-count';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata = {
  title: {
    default: 'Admin Console | അഴിമതി മയം',
    template: '%s | Admin — അഴിമതി മയം',
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaffUser();
  const adminClient = createSupabaseAdminClient();
  const pendingRequests = await safeCount(
    adminClient
      .from('resource_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
  );

  // Student-upload moderation queue (table may not exist yet → 0).
  const pendingSubmissions = await safeCount(
    adminClient
      .from('material_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
  );

  return (
    <AdminShell
      profile={profile}
      pendingRequests={pendingRequests}
      pendingSubmissions={pendingSubmissions}
    >
      {children}
    </AdminShell>
  );
}
