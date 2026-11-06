import { requireAdminUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { ResourcesManagerClient } from '@/components/admin/ResourcesManagerClient';

export const metadata = {
  title: 'Study Materials Management',
};

export default async function AdminResourcesPage() {
  await requireAdminUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <ResourcesManagerClient
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
      semesters={taxonomy.semesters}
      subjects={taxonomy.subjects}
      categories={taxonomy.categories}
    />
  );
}
