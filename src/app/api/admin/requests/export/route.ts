import { type NextRequest } from 'next/server';
import { requireApiStaff } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { csvFileName, csvResponse, toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting',
  in_progress: 'Being worked on',
  fulfilled: 'Done',
  rejected: 'Closed',
};

const TYPE_LABELS: Record<string, string> = {
  notes: 'Notes',
  question_paper: 'Question paper',
  short_notes: 'Short notes',
  cheat_sheet: 'Cheat sheet',
  syllabus: 'Syllabus',
  other: 'Something else',
};

interface ExportRow {
  created_at: string;
  status: string;
  request_type: string;
  title: string;
  subject_text: string | null;
  details: string | null;
  admin_note: string | null;
  student?: { full_name: string | null; username: string } | null;
}

/**
 * CSV of the request list, honouring whatever the console is currently
 * filtering by — the file matches what is on screen.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') || '').replace(/[,%()'"\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const status = sp.get('status') || '';

  const adminClient = createSupabaseAdminClient();

  let query = adminClient
    .from('resource_requests')
    .select('created_at, status, request_type, title, subject_text, details, admin_note, student:profiles!student_id(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (['pending', 'in_progress', 'fulfilled', 'rejected'].includes(status)) {
    query = query.eq('status', status);
  }

  if (q.length >= 2) {
    const like = `%${q}%`;
    const { data: students } = await adminClient
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.${like},username.ilike.${like}`)
      .limit(50);
    const parts = [`title.ilike.${like}`, `subject_text.ilike.${like}`, `details.ilike.${like}`];
    const ids = (students || []).map((student) => student.id);
    if (ids.length > 0) parts.push(`student_id.in.(${ids.join(',')})`);
    query = query.or(parts.join(','));
  }

  const { data, error } = await query;

  if (error) {
    return new Response('Could not build that export. Please try again.', { status: 400 });
  }

  const rows = (data || []) as unknown as ExportRow[];

  const csv = toCsv(rows, [
    { header: 'Requested', value: (row) => new Date(row.created_at).toISOString() },
    { header: 'Status', value: (row) => STATUS_LABELS[row.status] || row.status },
    { header: 'Type', value: (row) => TYPE_LABELS[row.request_type] || row.request_type },
    { header: 'Title', value: (row) => row.title },
    { header: 'Subject', value: (row) => row.subject_text },
    { header: 'Details', value: (row) => row.details },
    { header: 'Student', value: (row) => row.student?.full_name || '' },
    { header: 'Username', value: (row) => (row.student?.username ? `@${row.student.username}` : '') },
    { header: 'Our reply', value: (row) => row.admin_note },
  ]);

  return csvResponse(csvFileName('student-requests'), csv);
}
