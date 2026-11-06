import { requireAdminUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { SemestersClient } from '@/components/admin/SemestersClient';

export const metadata = {
  title: 'Semesters Management',
};

export default async function AdminSemestersPage() {
  await requireAdminUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <SemestersClient programmes={taxonomy.programmes} semesters={taxonomy.semesters} />
  );
}
