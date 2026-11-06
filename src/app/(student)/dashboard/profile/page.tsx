import { requireStudentAppUser } from '@/lib/auth/session';
import { getPublishedTaxonomyBundle } from '@/lib/taxonomy';
import { ProfileEditorClient } from '@/components/student/ProfileEditorClient';

export const metadata = {
  title: 'Profile',
};

export default async function StudentProfilePage() {
  const [profile, taxonomy] = await Promise.all([
    requireStudentAppUser(),
    getPublishedTaxonomyBundle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium leading-tight text-charcoal sm:text-[32px]">Profile</h1>
        <p className="mt-1.5 text-sm text-muted">Your details, photo, and course.</p>
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
