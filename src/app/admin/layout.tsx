import { requireStaffUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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
  const { count: pendingRequests } = await adminClient
    .from('resource_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <AdminShell profile={profile} pendingRequests={pendingRequests || 0}>
      {children}
    </AdminShell>
  );
}
