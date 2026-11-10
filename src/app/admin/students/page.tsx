import { requireMainAdminUser } from '@/lib/auth/session';
import { getAdminLookupBundle } from '@/lib/admin-taxonomy';
import { StudentsManagerClient } from '@/components/admin/StudentsManagerClient';

export const metadata = {
  title: 'Student Accounts Management',
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireMainAdminUser();
  const taxonomy = await getAdminLookupBundle();
  const params = await searchParams;
  // Arrives pre-filtered when an admin picks a student out of the ⌘K palette.
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  return (
    <StudentsManagerClient
      initialQuery={initialQuery}
      universities={taxonomy.universities}
      programmes={taxonomy.programmes}
      specializations={taxonomy.specializations}
      regulations={taxonomy.regulations}
      semesters={taxonomy.semesters}
    />
  );
}
