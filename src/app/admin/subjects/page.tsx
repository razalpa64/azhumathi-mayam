import { requireAdminUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { SubjectsClient } from '@/components/admin/SubjectsClient';

export const metadata = {
  title: 'Subjects Management',
};

export default async function AdminSubjectsPage() {
  await requireAdminUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <SubjectsClient
      universities={taxonomy.universities}
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
      regulations={taxonomy.regulations}
      semesters={taxonomy.semesters}
      subjects={taxonomy.subjects}
    />
  );
}
