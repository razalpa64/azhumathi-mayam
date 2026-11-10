import { requireStaffUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { SubjectsClient } from '@/components/admin/SubjectsClient';

export const metadata = {
  title: 'Subjects Management',
};

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireStaffUser();
  const taxonomy = await getAdminTaxonomyBundle();
  const params = await searchParams;
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  return (
    <SubjectsClient
      initialQuery={initialQuery}
      universities={taxonomy.universities}
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
      regulations={taxonomy.regulations}
      semesters={taxonomy.semesters}
      subjects={taxonomy.subjects}
    />
  );
}
