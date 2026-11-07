import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, Layers } from 'lucide-react';
import { requireStudentAppUser, getWebsiteSettings } from '@/lib/auth/session';
import { getPublishedTaxonomyBundle } from '@/lib/taxonomy';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = {
  title: 'Courses',
};

export default async function CoursesPage() {
  const [profile, taxonomy, settings] = await Promise.all([
    requireStudentAppUser(),
    getPublishedTaxonomyBundle(),
    getWebsiteSettings(),
  ]);

  const enrolledProgramme = taxonomy.programmes.find((p) => p.id === profile.programme_id) || null;
  const enrolledSemesters = enrolledProgramme
    ? taxonomy.semesters.filter((s) => s.programme_id === enrolledProgramme.id)
    : [];

  const otherProgrammes = settings.allow_cross_programme_browsing
    ? taxonomy.programmes.filter((p) => p.id !== profile.programme_id)
    : [];

  return (
    <div className="space-y-9">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
            Courses
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your course, semester by semester.
          </p>
        </div>
        <Link
          href="/dashboard/profile"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
        >
          Change course
        </Link>
      </div>

      {/* Primary Enrolled Programme Card */}
      {enrolledProgramme ? (
        <section className="rounded-xl border border-burgundy-border bg-burgundy-tint/45 p-6 space-y-5 lg:rounded-[28px] lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="solid">Your course</Badge>
                <Badge variant="neutral">{enrolledProgramme.degree_level}</Badge>
                {profile.university ? (
                  <Badge variant="neutral">{profile.university.short_name}</Badge>
                ) : null}
                {profile.regulation ? (
                  <Badge variant="muted">{profile.regulation.name}</Badge>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-semibold text-charcoal">
                {enrolledProgramme.name}
                {enrolledProgramme.full_title ? ` — ${enrolledProgramme.full_title}` : ''}
              </h2>
              {profile.specialization ? (
                <p className="mt-1 text-sm font-medium text-burgundy">
                  {profile.specialization.name} ({profile.specialization.code})
                </p>
              ) : null}
              {enrolledProgramme.description ? (
                <p className="mt-1.5 text-xs text-muted max-w-2xl leading-relaxed">
                  {enrolledProgramme.description}
                </p>
              ) : null}
            </div>

            <Link
              href={`/dashboard/materials?programmeId=${enrolledProgramme.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              <span>All {enrolledProgramme.name} materials</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {enrolledSemesters.map((sem) => {
              const isCurrent = sem.id === profile.semester_id;
              const subjectCount = taxonomy.subjects.filter(
                (s) =>
                  s.programme_id === enrolledProgramme.id &&
                  s.semester_id === sem.id &&
                  (!profile.specialization_id ||
                    !s.specialization_id ||
                    s.specialization_id === profile.specialization_id) &&
                  (!profile.regulation_id ||
                    !s.regulation_id ||
                    s.regulation_id === profile.regulation_id) &&
                  (!profile.university_id ||
                    !s.university_id ||
                    s.university_id === profile.university_id)
              ).length;

              return (
                <Link
                  key={sem.id}
                  href={`/dashboard/materials?programmeId=${enrolledProgramme.id}&semesterId=${sem.id}${
                    profile.specialization_id ? `&specializationId=${profile.specialization_id}` : ''
                  }`}
                  className={`flex flex-col justify-between rounded-lg border p-4 transition-colors lg:rounded-2xl lg:p-5 ${
                    isCurrent
                      ? 'border-burgundy bg-canvas ring-1 ring-burgundy/20'
                      : 'border-line bg-canvas hover:border-burgundy-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-charcoal">{sem.label}</span>
                    {isCurrent ? <Badge variant="burgundy">Current</Badge> : null}
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {subjectCount} subject{subjectCount === 1 ? '' : 's'}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No course picked yet"
          description="Pick your course and semester in your profile, and this page fills itself in."
          action={
            <Link
              href="/dashboard/profile"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              Go to profile
            </Link>
          }
        />
      )}

      {/* Other University Programmes */}
      {settings.allow_cross_programme_browsing && otherProgrammes.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Other programmes</h2>
            <p className="text-xs text-muted">
              Materials from other courses, if you’re curious.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {otherProgrammes.map((prog) => {
              const specs = taxonomy.specializations.filter((sp) => sp.programme_id === prog.id);
              const sems = taxonomy.semesters.filter((sm) => sm.programme_id === prog.id);
              return (
                <div
                  key={prog.id}
                  className="flex flex-col justify-between rounded-lg border border-line bg-canvas p-5 lg:rounded-[24px] lg:p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="neutral">{prog.degree_level}</Badge>
                      <span className="font-mono text-xs text-muted">
                        {sems.length || prog.total_semesters} Semesters
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-charcoal">
                      {prog.name}
                      {prog.full_title ? (
                        <span className="block text-xs font-normal text-muted mt-0.5">
                          {prog.full_title}
                        </span>
                      ) : null}
                    </h3>
                    {specs.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {specs.slice(0, 5).map((sp) => (
                          <Link
                            key={sp.id}
                            href={`/dashboard/materials?programmeId=${prog.id}&specializationId=${sp.id}&scope=all`}
                            className="rounded border border-line bg-neutral-soft px-2 py-0.5 text-[11px] font-medium text-charcoal hover:border-burgundy-border hover:text-burgundy"
                          >
                            {sp.code}
                          </Link>
                        ))}
                        {specs.length > 5 ? (
                          <span className="px-1.5 py-0.5 text-[11px] text-muted">
                            +{specs.length - 5} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 border-t border-line pt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Layers className="h-3.5 w-3.5" />
                      {prog.total_semesters} semesters
                    </span>
                    <Link
                      href={`/dashboard/materials?programmeId=${prog.id}&scope=all`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Browse</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
