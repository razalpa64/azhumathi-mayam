import { requireStaffUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { ResourcesManagerClient } from '@/components/admin/ResourcesManagerClient';

export const metadata = {
  title: 'Study Materials Management',
};

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireStaffUser();
  const taxonomy = await getAdminTaxonomyBundle();
  const params = await searchParams;
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  return (
    <ResourcesManagerClient
      initialQuery={initialQuery}
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
      semesters={taxonomy.semesters}
      subjects={taxonomy.subjects}
      categories={taxonomy.categories}
    />
  );
}
