import { requireStaffUser } from '@/lib/auth/session';
import { getAdminLookupBundle, getAdminSubjects } from '@/lib/admin-taxonomy';
import { ImportantQuestionsManagerClient } from '@/components/admin/ImportantQuestionsManagerClient';

export const metadata = {
  title: 'Important Questions',
};

export default async function AdminImportantQuestionsPage() {
  await requireStaffUser();
  const [lookups, subjects] = await Promise.all([
    getAdminLookupBundle(),
    getAdminSubjects(),
  ]);

  const programmeName = new Map(lookups.programmes.map((p) => [p.id, p.name]));
  const semesterLabel = new Map(lookups.semesters.map((s) => [s.id, s.label]));

  const slimSubjects = subjects.map((s) => ({
    id: s.id,
    subject_code: s.subject_code,
    name: s.name,
    programme: programmeName.get(s.programme_id) || '',
    semester: semesterLabel.get(s.semester_id) || '',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Important questions
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          The most-repeated exam questions per subject — the first thing
          students look for in exam week. Add a question, the years it was
          asked, and how many times it has appeared; students see them
          ranked by repeats.
        </p>
      </div>

      <ImportantQuestionsManagerClient subjects={slimSubjects} />
    </div>
  );
}
