import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import type {
  AcademicRegulation,
  Programme,
  ResourceCategory,
  Semester,
  Specialization,
  Subject,
  University,
} from '@/types/database';

export async function getAdminTaxonomyBundle() {
  const adminClient = createSupabaseAdminClient();

  const [
    { data: universities },
    { data: programmes },
    { data: specializations },
    { data: regulations },
    { data: semesters },
    { data: categories },
    subjects,
  ] = await Promise.all([
    adminClient.from('universities').select('*').order('display_order').order('name'),
    adminClient.from('programmes').select('*').order('display_order').order('name'),
    adminClient.from('specializations').select('*').order('display_order').order('name'),
    adminClient.from('academic_regulations').select('*').order('display_order').order('name'),
    adminClient.from('semesters').select('*').order('semester_number'),
    adminClient.from('resource_categories').select('*').order('display_order').order('name'),
    // Subjects outnumber PostgREST's 1,000-row response cap (1,500+),
    // so this fetch MUST paginate — a plain select silently drops
    // every subject past the first thousand from the admin pickers.
    fetchAllRows(async (from, to) =>
      adminClient
        .from('subjects')
        .select('*')
        .order('subject_code')
        .order('name')
        .order('id')
        .range(from, to)
    ),
  ]);

  return {
    universities: (universities || []) as University[],
    programmes: (programmes || []) as Programme[],
    specializations: (specializations || []) as Specialization[],
    regulations: (regulations || []) as AcademicRegulation[],
    semesters: (semesters || []) as Semester[],
    subjects: (subjects || []) as Subject[],
    categories: (categories || []) as ResourceCategory[],
  };
}
