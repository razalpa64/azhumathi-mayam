import { requireStaffUser } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SubmissionsManagerClient } from '@/components/admin/SubmissionsManagerClient';
import type { MaterialSubmission } from '@/types/database';

export const metadata = {
  title: 'Student Uploads',
};

export default async function AdminSubmissionsPage() {
  await requireStaffUser();
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('material_submissions')
    .select(
      '*, student:profiles!student_id(id, full_name, username), subject:subjects(id, subject_code, name), category:resource_categories(id, name)'
    )
    .order('created_at', { ascending: true })
    .limit(200);

  const items = (data || []) as unknown as MaterialSubmission[];
  const pending = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">Student uploads</h1>
        <p className="mt-1 text-sm text-muted">
          Materials students contributed through Google Drive links.
          {pending > 0 ? (
            <>
              {' '}
              <span className="font-semibold text-burgundy">
                {pending} waiting for review.
              </span>
            </>
          ) : (
            ' Nothing waiting right now.'
          )}{' '}
          Approving publishes the material instantly, credited to the student.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-burgundy-border bg-burgundy-tint px-5 py-4 text-sm text-charcoal">
          <span className="font-semibold text-burgundy">Student uploads are not switched on yet.</span>{' '}
          The <span className="font-mono text-[13px]">material_submissions</span> table was not
          found — paste{' '}
          <span className="font-mono text-[13px]">supabase/migrations/0024_contributions_important_questions.sql</span>{' '}
          into the Supabase SQL editor (or run{' '}
          <span className="font-mono text-[13px]">npm run db:provision</span>), then reload this page.
        </div>
      ) : null}

      <SubmissionsManagerClient initialItems={items} />
    </div>
  );
}
