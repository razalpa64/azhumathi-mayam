import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AcademicRegulation,
  Programme,
  ResourceCategory,
  Semester,
  Specialization,
  Subject,
  University,
} from '@/types/database';

export async function getPublishedTaxonomyBundle() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: universities },
    { data: programmes },
    { data: specializations },
    { data: regulations },
    { data: semesters },
    { data: subjects },
    { data: categories },
  ] = await Promise.all([
    supabase.from('universities').select('*').eq('is_active', true).order('display_order').order('name'),
    supabase.from('programmes').select('*').eq('is_active', true).order('display_order').order('name'),
    supabase.from('specializations').select('*').eq('is_active', true).order('display_order').order('name'),
    supabase
      .from('academic_regulations')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    supabase.from('semesters').select('*').eq('is_active', true).order('semester_number'),
    supabase
      .from('subjects')
      .select('*')
      .eq('publication_status', 'published')
      .order('subject_code'),
    supabase
      .from('resource_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
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
