import { cache } from 'react';
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

/**
 * Admin taxonomy, split by weight:
 *  - getAdminLookupBundle: the six small lookup tables most admin
 *    pages need for pickers and labels.
 *  - getAdminSubjects: the full subjects table (2,000+ rows, paginated)
 *    — only the Subjects, Resources and Upload pages need it. Pages
 *    that used to fetch the whole bundle just for lookups were paying
 *    for a 2,000-row download on every navigation.
 *  - getAdminTaxonomyBundle: lookups + subjects, for the pages that
 *    genuinely need everything.
 * All three are React cache()d, so within one request the database is
 * hit once no matter how many server components ask.
 */

export interface AdminLookupBundle {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
  categories: ResourceCategory[];
}

export interface AdminTaxonomyBundle extends AdminLookupBundle {
  subjects: Subject[];
}

async function fetchAdminLookupBundle(): Promise<AdminLookupBundle> {
  const adminClient = createSupabaseAdminClient();

  const [
    { data: universities },
    { data: programmes },
    { data: specializations },
    { data: regulations },
    { data: semesters },
    { data: categories },
  ] = await Promise.all([
    adminClient.from('universities').select('*').order('display_order').order('name'),
    adminClient.from('programmes').select('*').order('display_order').order('name'),
    adminClient.from('specializations').select('*').order('display_order').order('name'),
    adminClient.from('academic_regulations').select('*').order('display_order').order('name'),
    adminClient.from('semesters').select('*').order('semester_number'),
    adminClient.from('resource_categories').select('*').order('display_order').order('name'),
  ]);

  return {
    universities: (universities || []) as University[],
    programmes: (programmes || []) as Programme[],
    specializations: (specializations || []) as Specialization[],
    regulations: (regulations || []) as AcademicRegulation[],
    semesters: (semesters || []) as Semester[],
    categories: (categories || []) as ResourceCategory[],
  };
}

async function fetchAdminSubjects(): Promise<Subject[]> {
  const adminClient = createSupabaseAdminClient();

  // Subjects outnumber PostgREST's 1,000-row response cap (2,000+),
  // so this fetch MUST paginate — a plain select silently drops
  // every subject past the first thousand from the admin pickers.
  const subjects = await fetchAllRows(async (from, to) =>
    adminClient
      .from('subjects')
      .select('*')
      .order('subject_code')
      .order('name')
      .order('id')
      .range(from, to)
  );
  return (subjects || []) as Subject[];
}

export const getAdminLookupBundle = cache(fetchAdminLookupBundle);
export const getAdminSubjects = cache(fetchAdminSubjects);

async function fetchAdminTaxonomyBundle(): Promise<AdminTaxonomyBundle> {
  // Compose the cached pieces so a request never fetches twice.
  const [lookups, subjects] = await Promise.all([
    getAdminLookupBundle(),
    getAdminSubjects(),
  ]);
  return { ...lookups, subjects };
}

export const getAdminTaxonomyBundle = cache(fetchAdminTaxonomyBundle);
