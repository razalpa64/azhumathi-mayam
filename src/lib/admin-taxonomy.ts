import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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
    { data: subjects },
    { data: categories },
  ] = await Promise.all([
    adminClient.from('universities').select('*').order('display_order').order('name'),
    adminClient.from('programmes').select('*').order('display_order').order('name'),
    adminClient.from('specializations').select('*').order('display_order').order('name'),
    adminClient.from('academic_regulations').select('*').order('display_order').order('name'),
    adminClient.from('semesters').select('*').order('semester_number'),
    adminClient.from('subjects').select('*').order('subject_code').order('name'),
    adminClient.from('resource_categories').select('*').order('display_order').order('name'),
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
