import { requireStudentAppUser } from '@/lib/auth/session';
import { getPublishedTaxonomyBundle } from '@/lib/taxonomy';
import { filterTaxonomyToSeeded } from '@/lib/seeded-taxonomy';
import { ProfileEditorClient } from '@/components/student/ProfileEditorClient';

export const metadata = {
  title: 'Profile',
};

export default async function StudentProfilePage() {
  const [profile, taxonomy] = await Promise.all([
    requireStudentAppUser(),
    getPublishedTaxonomyBundle(),
  ]);

  // Only offer programmes/branches that have subjects behind them —
  // picking an unseeded one strands the student on empty lists. A
  // student already registered under an unseeded programme/branch
  // keeps their own current values as options, so their form is
  // never left blank or silently changed.
  const seeded = filterTaxonomyToSeeded(taxonomy, taxonomy.subjects);
  const programmes =
    !profile.programme_id || seeded.programmes.some((p) => p.id === profile.programme_id)
      ? seeded.programmes
      : profile.programme
        ? [...seeded.programmes, profile.programme]
        : seeded.programmes;
  // Branches are offered for the chosen programme without the "has
  // subjects" narrowing: that narrowing could empty the branch field for a
  // whole programme (most subjects are programme-level, with no branch at
  // all), leaving a student unable to correct their own branch. A quiet
  // dashboard is fixable; a dead field is not.
  const specializations = seeded.specializations.length
    ? seeded.specializations
    : taxonomy.specializations;
  const universities =
    !profile.university_id || seeded.universities.some((u) => u.id === profile.university_id)
      ? seeded.universities
      : profile.university
        ? [...seeded.universities, profile.university]
        : seeded.universities;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Your details, photo, and course.
        </p>
      </div>

      <ProfileEditorClient
        profile={profile}
        universities={universities}
        programmes={programmes}
        specializations={specializations}
        regulations={taxonomy.regulations}
        semesters={taxonomy.semesters}
      />
    </div>
  );
}
