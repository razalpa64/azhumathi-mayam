import { requireAdminUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { StudentsManagerClient } from '@/components/admin/StudentsManagerClient';

export const metadata = {
  title: 'Student Accounts Management',
};

export default async function AdminStudentsPage() {
  await requireAdminUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <StudentsManagerClient
      universities={taxonomy.universities}
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
      regulations={taxonomy.regulations}
      semesters={taxonomy.semesters}
    />
  );
}
