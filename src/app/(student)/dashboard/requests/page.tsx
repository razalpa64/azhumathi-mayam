import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RequestsClient } from '@/components/student/RequestsClient';
import type { ResourceRequest } from '@/types/database';

export const metadata = {
  title: 'Requests',
};

export default async function RequestsPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('resource_requests')
    .select('*')
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">Requests</h1>
        <p className="mt-1 text-sm text-muted">
          Can’t find a note or a paper? Ask here — we’ll try to get it for you.
        </p>
      </div>

      <RequestsClient initialItems={(data || []) as ResourceRequest[]} />
    </div>
  );
}
