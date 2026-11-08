import { requireStaffUser } from '@/lib/auth/session';
import { getAdminLookupBundle } from '@/lib/admin-taxonomy';
import { CoursesUniversitiesClient } from '@/components/admin/CoursesUniversitiesClient';

export const metadata = {
  title: 'Courses & Universities Management',
};

export default async function AdminCoursesPage() {
  await requireStaffUser();
  const taxonomy = await getAdminLookupBundle();

  return (
    <CoursesUniversitiesClient
      initialUniversities={taxonomy.universities}
      initialProgrammes={taxonomy.programmes}
      initialCategories={taxonomy.categories}
    />
  );
}
