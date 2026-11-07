import { requireStaffUser } from '@/lib/auth/session';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { UploadResourceClient } from '@/components/admin/UploadResourceClient';

export const metadata = {
  title: 'Upload Study Resource',
};

export default async function AdminUploadPage() {
  await requireStaffUser();
  const taxonomy = await getAdminTaxonomyBundle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Upload & Link Study Resource
        </h1>
        <p className="mt-1 text-sm text-muted">
          Link a Google Drive document, validate its sharing permissions, preview inline, and publish to students.
        </p>
      </div>

      <UploadResourceClient
        universities={taxonomy.universities}
        programmes={taxonomy.programmes}
        specializations={taxonomy.specializations}
        regulations={taxonomy.regulations}
        semesters={taxonomy.semesters}
        subjects={taxonomy.subjects}
        categories={taxonomy.categories}
      />
    </div>
  );
}
