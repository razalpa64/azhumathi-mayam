import { requireStaffUser } from '@/lib/auth/session';
import { getAdminLookupBundle } from '@/lib/admin-taxonomy';
import { SemestersClient } from '@/components/admin/SemestersClient';

export const metadata = {
  title: 'Semesters Management',
};

export default async function AdminSemestersPage() {
  await requireStaffUser();
  const taxonomy = await getAdminLookupBundle();

  return (
    <SemestersClient programmes={taxonomy.programmes} semesters={taxonomy.semesters} />
  );
}
