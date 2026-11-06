import { requireAdminUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { SpecializationsClient } from '@/components/admin/SpecializationsClient';

export const metadata = {
  title: 'Specializations Management',
};

export default async function AdminSpecializationsPage() {
  await requireAdminUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <SpecializationsClient
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
    />
  );
}
