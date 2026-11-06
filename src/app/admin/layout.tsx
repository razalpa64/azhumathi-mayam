import { requireAdminUser } from '@/lib/auth/session';
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
  const profile = await requireAdminUser();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
