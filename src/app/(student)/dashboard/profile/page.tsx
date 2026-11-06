import { requireStudentAppUser } from '@/lib/auth/session';
import { getPublishedTaxonomyBundle } from '@/lib/taxonomy';
import { ProfileEditorClient } from '@/components/student/ProfileEditorClient';

export const metadata = {
  title: 'My Profile',
};

export default async function StudentProfilePage() {
  const [profile, taxonomy] = await Promise.all([
    requireStudentAppUser(),
    getPublishedTaxonomyBundle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">My Academic Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your personal details, profile photo, and enrolled curriculum settings.
        </p>
      </div>

      <ProfileEditorClient
        profile={profile}
        universities={taxonomy.universities}
        programmes={taxonomy.programmes}
        specializations={taxonomy.specializations}
        regulations={taxonomy.regulations}
        semesters={taxonomy.semesters}
      />
    </div>
  );
}
