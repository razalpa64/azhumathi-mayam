import { NextResponse, type NextRequest } from 'next/server';
import { requireApiStaff } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * One query, three tables. Powers the ⌘K palette in the admin console: an
 * admin can type half a name and land on the student, the subject or the
 * resource without knowing which page it lives on.
 *
 * Sub-admins never see student rows here — same rule as the sidebar, where
 * Students is a main-admin-only destination.
 */
export interface AdminSearchItem {
  id: string;
  kind: 'student' | 'subject' | 'resource';
  title: string;
  subtitle: string | null;
  href: string;
}

const LIMIT = 5;

/** PostgREST filters are comma/paren delimited, so strip anything structural. */
function sanitize(value: string) {
  return value.replace(/[,%()'\"\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function studentHref(username: string) {
  const sp = new URLSearchParams({ q: username });
  return `/admin/students?${sp.toString()}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const raw = sanitize(request.nextUrl.searchParams.get('q') || '');
  if (raw.length < 2) {
    return NextResponse.json({ items: [] as AdminSearchItem[], query: raw });
  }

  const like = `%${raw}%`;
  const isMainAdmin = auth.profile.role === 'admin';
  const adminClient = createSupabaseAdminClient();

  const [studentsRes, subjectsRes, resourcesRes] = await Promise.all([
    isMainAdmin
      ? adminClient
          .from('profiles')
          .select('id, full_name, username, programme:programmes(name)')
          .eq('role', 'student')
          .or(`full_name.ilike.${like},username.ilike.${like}`)
          .order('full_name', { ascending: true })
          .limit(LIMIT)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    adminClient
      .from('subjects')
      .select('id, subject_code, name, semester:semesters(label)')
      .or(`subject_code.ilike.${like},name.ilike.${like}`)
      .order('subject_code', { ascending: true })
      .limit(LIMIT),
    adminClient
      .from('resources')
      .select('id, title, file_type, subject:subjects(subject_code)')
      .ilike('title', like)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
  ]);

  const items: AdminSearchItem[] = [];

  for (const row of (studentsRes.data || []) as unknown as {
    id: string;
    full_name: string | null;
    username: string;
    programme?: { name?: string | null } | null;
  }[]) {
    items.push({
      id: `student-${row.id}`,
      kind: 'student',
      title: row.full_name || row.username,
      subtitle: [`@${row.username}`, row.programme?.name].filter(Boolean).join(' · '),
      href: studentHref(row.username),
    });
  }

  for (const row of (subjectsRes.data || []) as unknown as {
    id: string;
    subject_code: string;
    name: string | null;
    semester?: { label?: string | null } | null;
  }[]) {
    items.push({
      id: `subject-${row.id}`,
      kind: 'subject',
      title: `${row.subject_code}${row.name ? ` · ${row.name}` : ''}`,
      subtitle: row.semester?.label || null,
      href: `/admin/subjects?${new URLSearchParams({ q: row.subject_code }).toString()}`,
    });
  }

  for (const row of (resourcesRes.data || []) as unknown as {
    id: string;
    title: string;
    file_type: string | null;
    subject?: { subject_code?: string | null } | null;
  }[]) {
    items.push({
      id: `resource-${row.id}`,
      kind: 'resource',
      title: row.title,
      subtitle: [row.subject?.subject_code, row.file_type].filter(Boolean).join(' · ') || null,
      href: `/admin/resources?${new URLSearchParams({ q: row.title }).toString()}`,
    });
  }

  return NextResponse.json({ items, query: raw });
}
