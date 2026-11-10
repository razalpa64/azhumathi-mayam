import { type NextRequest } from 'next/server';
import { requireApiAdmin } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { csvFileName, csvResponse, toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

interface ExportRow {
  username: string;
  full_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  university?: { short_name: string | null } | null;
  programme?: { code: string | null; name: string | null } | null;
  specialization?: { code: string | null } | null;
  semester?: { label: string | null } | null;
}

function when(value: string | null) {
  return value ? new Date(value).toISOString().replace('T', ' ').slice(0, 16) : '';
}

/**
 * The student table as a spreadsheet — same filters as the page, so an admin
 * can hand over "B.Tech CSE semester 3, active" without copying screenshots.
 * Passwords are never included: the console only ever stores them in Supabase
 * Auth, and a reset generates a new one.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') || '').replace(/[,%()'"\\]/g, ' ').trim();
  const programmeId = sp.get('programmeId') || '';
  const semesterId = sp.get('semesterId') || '';
  const status = sp.get('status') || '';

  const adminClient = createSupabaseAdminClient();

  let query = adminClient
    .from('profiles')
    .select(
      'username, full_name, is_active, last_login_at, created_at, university:universities(short_name), programme:programmes(code, name), specialization:specializations(code), semester:semesters(label)'
    )
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (programmeId) query = query.eq('programme_id', programmeId);
  if (semesterId) query = query.eq('semester_id', semesterId);
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (q) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);

  const { data, error } = await query;

  if (error) {
    return new Response('Could not build that export. Please try again.', { status: 400 });
  }

  const rows = (data || []) as unknown as ExportRow[];

  const csv = toCsv(rows, [
    { header: 'Username', value: (row) => `@${row.username}` },
    { header: 'Full name', value: (row) => row.full_name },
    { header: 'University', value: (row) => row.university?.short_name },
    { header: 'Programme', value: (row) => row.programme?.name || row.programme?.code },
    { header: 'Specialization', value: (row) => row.specialization?.code },
    { header: 'Semester', value: (row) => row.semester?.label },
    { header: 'Status', value: (row) => (row.is_active ? 'Active' : 'Disabled') },
    { header: 'Last login', value: (row) => when(row.last_login_at) },
    { header: 'Joined', value: (row) => when(row.created_at) },
  ]);

  return csvResponse(csvFileName('students'), csv);
}
