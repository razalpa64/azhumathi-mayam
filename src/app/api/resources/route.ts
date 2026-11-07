import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { audienceSubjectIds, getSubjectGroupIds } from '@/lib/subject-siblings';

const RESOURCE_SELECT = `
  *,
  programme:programmes(id, code, name),
  specialization:specializations(id, code, name),
  semester:semesters(id, semester_number, label),
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name, slug, is_question_paper),
  university:universities(id, short_name, name),
  regulation:academic_regulations(id, code, name)
`;

function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,%()'"\\]/g, ' ').trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const sp = request.nextUrl.searchParams;

  const mode = sp.get('mode') || 'list';
  const rawQuery = sp.get('q') || '';
  const q = sanitizeSearchTerm(rawQuery);
  const universityId = sp.get('universityId') || '';
  const programmeId = sp.get('programmeId') || '';
  const specializationId = sp.get('specializationId') || '';
  const regulationId = sp.get('regulationId') || '';
  const semesterId = sp.get('semesterId') || '';
  const subjectId = sp.get('subjectId') || '';
  const categoryId = sp.get('categoryId') || '';
  const onlyQuestionPapers = sp.get('onlyQuestionPapers') === 'true';
  const sort = sp.get('sort') || 'latest';
  const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1);
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(sp.get('pageSize') || '12', 10) || 12));

  // Autocomplete suggestion mode
  if (mode === 'suggest') {
    if (!q || q.length < 2) {
      return NextResponse.json({ resources: [], subjects: [] });
    }

    const [{ data: subjects }, { data: resources }] = await Promise.all([
      supabase
        .from('subjects')
        .select('id, subject_code, name, programme_id, semester_id, programme:programmes(name), semester:semesters(label)')
        .eq('publication_status', 'published')
        .or(`name.ilike.%${q}%,subject_code.ilike.%${q}%`)
        .order('subject_code')
        .limit(12),
      supabase
        .from('resources')
        .select('id, title, file_type, subject:subjects(subject_code, name), category:resource_categories(name)')
        .eq('publication_status', 'published')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .order('download_count', { ascending: false })
        .limit(6),
    ]);

    // The same course can be stored once per branch; suggest it once.
    const seenCodes = new Set<string>();
    const subjectSuggestions = (subjects || []).filter((s) => {
      const key = `${s.subject_code}|${s.semester_id}`;
      if (seenCodes.has(key)) return false;
      seenCodes.add(key);
      return true;
    });

    return NextResponse.json({
      subjects: subjectSuggestions.slice(0, 5),
      resources: resources || [],
    });
  }

  // A course may be stored once per branch; a subject filter must
  // match materials attached to ANY copy of that course.
  const subjectGroupIds = subjectId ? await getSubjectGroupIds(supabase, subjectId) : null;

  // Branch browsing means "the subjects that branch actually has".
  // A course taken by only some branches stores its materials as
  // branch-less (shared), so a plain branch-or-shared filter leaks
  // them to branches that take a different course instead (AIDS
  // seeing the CSE-family OOP). Scope by course group instead: the
  // audience is every copy of the courses this branch takes in this
  // context. Falls back to the branch-or-shared rule when subject
  // data is missing or the audience would be too large to send.
  let branchAudienceIds: string[] | null = null;
  if (specializationId && !subjectGroupIds) {
    let scopeQuery = supabase
      .from('subjects')
      .select('id, subject_code, semester_id, regulation_id, specialization_id')
      .eq('publication_status', 'published');
    if (programmeId) scopeQuery = scopeQuery.eq('programme_id', programmeId);
    if (semesterId) scopeQuery = scopeQuery.eq('semester_id', semesterId);
    const { data: scopeSubjects } = await scopeQuery;
    if (scopeSubjects && scopeSubjects.length > 0) {
      const effectiveRegulationId =
        regulationId ||
        (programmeId && auth.profile.programme_id === programmeId
          ? auth.profile.regulation_id
          : null);
      const visibleIds = new Set(
        scopeSubjects
          .filter(
            (s) =>
              (!s.specialization_id || s.specialization_id === specializationId) &&
              (!effectiveRegulationId ||
                !s.regulation_id ||
                s.regulation_id === effectiveRegulationId)
          )
          .map((s) => s.id as string)
      );
      const ids = audienceSubjectIds(scopeSubjects, visibleIds);
      if (ids.length > 0 && ids.length <= 150) branchAudienceIds = ids;
    }
  }

  let query = supabase
    .from('resources')
    .select(RESOURCE_SELECT, { count: 'exact' })
    .eq('publication_status', 'published');

  if (universityId) query = query.eq('university_id', universityId);
  if (programmeId) query = query.eq('programme_id', programmeId);
  // "My branch" means the courses that branch takes (course-group
  // audience above) whenever it could be computed; otherwise shared
  // (NULL) materials plus the branch's own. When a subject is picked,
  // its course group already defines the audience, so this is skipped.
  if (specializationId && !subjectGroupIds) {
    if (branchAudienceIds) {
      query = query.in('subject_id', branchAudienceIds);
    } else {
      query = query.or(
        `specialization_id.is.null,specialization_id.eq.${specializationId}`
      );
    }
  }
  if (regulationId) query = query.eq('regulation_id', regulationId);
  if (semesterId) query = query.eq('semester_id', semesterId);
  if (subjectGroupIds) query = query.in('subject_id', subjectGroupIds);
  if (categoryId) query = query.eq('category_id', categoryId);

  if (onlyQuestionPapers) {
    const { data: qpCats } = await supabase
      .from('resource_categories')
      .select('id')
      .eq('is_question_paper', true);
    const ids = (qpCats || []).map((c) => c.id);
    if (ids.length > 0) {
      query = query.in('category_id', ids);
    } else {
      return NextResponse.json({ items: [], total: 0, page, pageSize, totalPages: 0 });
    }
  }

  // "Short Notes & Exam Special" collection (categories flagged is_short_note)
  if (sp.get('collection') === 'short-notes') {
    let snCats: { id: string }[] | null = null;
    const byFlag = await supabase
      .from('resource_categories')
      .select('id')
      .eq('is_short_note', true);
    if (!byFlag.error) {
      snCats = byFlag.data;
    } else {
      // Migration 0003 not applied yet — fall back to the canonical slugs
      const bySlug = await supabase
        .from('resource_categories')
        .select('id')
        .in('slug', ['short-notes', 'cheat-sheets']);
      snCats = bySlug.data;
    }
    const ids = (snCats || []).map((c) => c.id);
    if (ids.length > 0) {
      query = query.in('category_id', ids);
    } else {
      return NextResponse.json({ items: [], total: 0, page, pageSize, totalPages: 0 });
    }
  }

  if (q) {
    // Resolve matching subjects, programmes, semesters, categories for comprehensive search
    const [subjRes, progRes, semRes, catRes] = await Promise.all([
      supabase
        .from('subjects')
        .select('id')
        .eq('publication_status', 'published')
        .or(`name.ilike.%${q}%,subject_code.ilike.%${q}%`)
        .limit(500),
      supabase
        .from('programmes')
        .select('id')
        .or(`name.ilike.%${q}%,code.ilike.%${q}%,full_title.ilike.%${q}%`)
        .limit(15),
      supabase.from('semesters').select('id').ilike('label', `%${q}%`).limit(15),
      supabase.from('resource_categories').select('id').ilike('name', `%${q}%`).limit(15),
    ]);

    const orClauses: string[] = [
      `title.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      `keywords.cs.{${q.toLowerCase()}}`,
    ];

    const sIds = (subjRes.data || []).map((s) => s.id);
    if (sIds.length > 0) orClauses.push(`subject_id.in.(${sIds.join(',')})`);

    const pIds = (progRes.data || []).map((p) => p.id);
    if (pIds.length > 0) orClauses.push(`programme_id.in.(${pIds.join(',')})`);

    const semIds = (semRes.data || []).map((s) => s.id);
    if (semIds.length > 0) orClauses.push(`semester_id.in.(${semIds.join(',')})`);

    const cIds = (catRes.data || []).map((c) => c.id);
    if (cIds.length > 0) orClauses.push(`category_id.in.(${cIds.join(',')})`);

    query = query.or(orClauses.join(','));
  }

  if (sort === 'popular') {
    query = query.order('download_count', { ascending: false }).order('created_at', { ascending: false });
  } else if (sort === 'title') {
    query = query.order('title', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: items, count, error } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'Search failed. Please try again.', 'student') || 'Search query failed.' }, { status: 400 });
  }

  // Fetch user's bookmark IDs for these items
  const resourceIds = (items || []).map((r) => r.id);
  let bookmarkedIds: string[] = [];
  if (resourceIds.length > 0) {
    const { data: bms } = await supabase
      .from('bookmarks')
      .select('resource_id')
      .eq('user_id', auth.profile.id)
      .in('resource_id', resourceIds);
    bookmarkedIds = (bms || []).map((b) => b.resource_id);
  }

  const total = count || 0;
  return NextResponse.json({
    items: items || [],
    bookmarkedIds,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
