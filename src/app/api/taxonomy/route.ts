import { NextResponse } from 'next/server';
import { isStaffRole, requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/supabase/fetch-all';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const isAdmin = isStaffRole(auth.profile.role);

  let univQuery = supabase.from('universities').select('*').order('display_order').order('name');
  let progQuery = supabase.from('programmes').select('*').order('display_order').order('name');
  let specQuery = supabase.from('specializations').select('*').order('display_order').order('name');
  let regQuery = supabase
    .from('academic_regulations')
    .select('*')
    .order('display_order')
    .order('name');
  let semQuery = supabase.from('semesters').select('*').order('semester_number');
  let catQuery = supabase
    .from('resource_categories')
    .select('*')
    .order('display_order')
    .order('name');

  if (!isAdmin) {
    univQuery = univQuery.eq('is_active', true);
    progQuery = progQuery.eq('is_active', true);
    specQuery = specQuery.eq('is_active', true);
    regQuery = regQuery.eq('is_active', true);
    semQuery = semQuery.eq('is_active', true);
    catQuery = catQuery.eq('is_active', true);
  }

  // Subjects outnumber PostgREST's 1,000-row response cap (1,500+),
  // so this fetch MUST paginate — a plain select silently drops every
  // subject past the first thousand. Fresh builder per page.
  const buildSubjectQuery = () => {
    let subjQuery = supabase
      .from('subjects')
      .select('*')
      .order('subject_code')
      .order('name')
      .order('id');
    if (!isAdmin) {
      subjQuery = subjQuery.eq('publication_status', 'published');
    }
    return subjQuery;
  };

  const [
    { data: universities },
    { data: programmes },
    { data: specializations },
    { data: regulations },
    { data: semesters },
    { data: categories },
    subjects,
  ] = await Promise.all([
    univQuery,
    progQuery,
    specQuery,
    regQuery,
    semQuery,
    catQuery,
    fetchAllRows(async (from, to) => buildSubjectQuery().range(from, to)),
  ]);

  return NextResponse.json({
    universities: universities || [],
    programmes: programmes || [],
    specializations: specializations || [],
    regulations: regulations || [],
    semesters: semesters || [],
    subjects: subjects || [],
    categories: categories || [],
  });
}
