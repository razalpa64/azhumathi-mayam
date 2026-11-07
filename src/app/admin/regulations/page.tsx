import { requireStaffUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { RegulationsClient } from '@/components/admin/RegulationsClient';

export const metadata = {
  title: 'Academic Regulations Management',
};

export default async function AdminRegulationsPage() {
  await requireStaffUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <RegulationsClient
      universities={taxonomy.universities}
      programmes={taxonomy.programmes}
      regulations={taxonomy.regulations}
    />
  );
}
