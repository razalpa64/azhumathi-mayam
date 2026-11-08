import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

async function fetchPublishedTaxonomyBundle() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: universities },
    { data: programmes },
    { data: specializations },
    { data: regulations },
    { data: semesters },
    { data: categories },
    subjects,
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
      .from('resource_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    // Subjects outnumber PostgREST's 1,000-row response cap (1,500+),
    // so this fetch MUST paginate — a plain select silently drops
    // every subject past the first thousand from pickers and counts.
    fetchAllRows(async (from, to) =>
      supabase
        .from('subjects')
        .select('*')
        .eq('publication_status', 'published')
        .order('subject_code')
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

/**
 * Per-request cached: several server components on a page can ask for
 * the bundle without re-downloading the full taxonomy each time.
 */
export const getPublishedTaxonomyBundle = cache(fetchPublishedTaxonomyBundle);
