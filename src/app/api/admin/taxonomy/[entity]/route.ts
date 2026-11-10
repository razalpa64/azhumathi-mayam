import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { requireApiStaff, logAdminActivity } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { programmeAllowsBranches } from '@/lib/programme-branches-server';
import { revalidateTag } from 'next/cache';
import { TAXONOMY_CACHE_TAG } from '@/lib/taxonomy';

const ALLOWED_ENTITIES = new Set([
  'universities',
  'programmes',
  'specializations',
  'academic_regulations',
  'semesters',
  'subjects',
  'resource_categories',
]);

/**
 * The sign-up pickers are cached across requests under TAXONOMY_CACHE_TAG.
 * Nothing else evicts that copy, so without this a programme staff create (or
 * hide) reached students up to five minutes late — or, worse, never within the
 * same deployment. Every successful taxonomy write drops it.
 */
function dropTaxonomyCache() {
  revalidateTag(TAXONOMY_CACHE_TAG);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const { entity } = await context.params;
  if (!ALLOWED_ENTITIES.has(entity)) {
    return NextResponse.json({ error: 'Unknown academic entity.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  let insertData: Record<string, unknown> = {};
  let summaryLabel = '';

  if (entity === 'universities') {
    const name = String(body.name || '').trim();
    const shortName = String(body.short_name || '').trim().toUpperCase();
    if (!name || !shortName) {
      return NextResponse.json(
        { error: 'University name and short code are required.' },
        { status: 400 }
      );
    }
    insertData = {
      name,
      short_name: shortName,
      location: body.location ? String(body.location).trim() : null,
      website_url: body.website_url ? String(body.website_url).trim() : null,
      is_active: body.is_active !== false,
      display_order: Number(body.display_order || 0),
    };
    summaryLabel = `${name} (${shortName})`;
  } else if (entity === 'programmes') {
    const name = String(body.name || '').trim();
    const code = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    const totalSemesters = Math.min(16, Math.max(1, Number(body.total_semesters || 6)));
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Programme name and code are required.' },
        { status: 400 }
      );
    }
    insertData = {
      university_id: body.university_id ? String(body.university_id) : null,
      code,
      name,
      full_title: body.full_title ? String(body.full_title).trim() : null,
      degree_level: ['UG', 'PG', 'Diploma', 'Doctoral'].includes(String(body.degree_level))
        ? String(body.degree_level)
        : 'UG',
      total_semesters: totalSemesters,
      has_specializations: Boolean(body.has_specializations),
      description: body.description ? String(body.description).trim() : null,
      is_active: body.is_active !== false,
      display_order: Number(body.display_order || 0),
    };
    summaryLabel = `${name} (${code})`;
  } else if (entity === 'specializations') {
    const programmeId = String(body.programme_id || '').trim();
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim().toUpperCase();
    if (!programmeId || !name || !code) {
      return NextResponse.json(
        { error: 'Programme, specialization name, and code are required.' },
        { status: 400 }
      );
    }
    // BBA / BCA / LLB and friends are single-course degrees: they are flagged
    // `has_specializations = false`, so a branch filed under one would never
    // be offered anywhere — refuse it instead of creating dead taxonomy.
    if (!(await programmeAllowsBranches(adminClient, programmeId))) {
      return NextResponse.json(
        {
          error:
            'This programme is marked as having no branches, so it cannot have specializations. Enable “Has specializations” for it under Courses & Universities first.',
        },
        { status: 400 }
      );
    }
    insertData = {
      programme_id: programmeId,
      code,
      name,
      description: body.description ? String(body.description).trim() : null,
      is_active: body.is_active !== false,
      display_order: Number(body.display_order || 0),
    };
    summaryLabel = `${name} (${code})`;
  } else if (entity === 'academic_regulations') {
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim().toUpperCase();
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Regulation name and code are required.' },
        { status: 400 }
      );
    }
    insertData = {
      university_id: body.university_id ? String(body.university_id) : null,
      programme_id: body.programme_id ? String(body.programme_id) : null,
      code,
      name,
      batch_range: body.batch_range ? String(body.batch_range).trim() : null,
      is_active: body.is_active !== false,
      display_order: Number(body.display_order || 0),
    };
    summaryLabel = `${name} (${code})`;
  } else if (entity === 'semesters') {
    const programmeId = String(body.programme_id || '').trim();
    const semNum = Math.min(16, Math.max(1, Number(body.semester_number || 1)));
    const label = String(body.label || `Semester ${semNum}`).trim();
    if (!programmeId) {
      return NextResponse.json({ error: 'Programme is required.' }, { status: 400 });
    }
    insertData = {
      programme_id: programmeId,
      semester_number: semNum,
      label,
      is_active: body.is_active !== false,
    };
    summaryLabel = label;
  } else if (entity === 'subjects') {
    const programmeId = String(body.programme_id || '').trim();
    const semesterId = String(body.semester_id || '').trim();
    const subjectCode = String(body.subject_code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    if (!programmeId || !semesterId || !subjectCode || !name) {
      return NextResponse.json(
        { error: 'Programme, semester, subject code, and subject name are required.' },
        { status: 400 }
      );
    }
    insertData = {
      university_id: body.university_id ? String(body.university_id) : null,
      programme_id: programmeId,
      specialization_id: body.specialization_id ? String(body.specialization_id) : null,
      regulation_id: body.regulation_id ? String(body.regulation_id) : null,
      semester_id: semesterId,
      subject_code: subjectCode,
      name,
      description: body.description ? String(body.description).trim() : null,
      publication_status: body.publication_status === 'draft' ? 'draft' : 'published',
    };
    summaryLabel = `${subjectCode} — ${name}`;
  } else if (entity === 'resource_categories') {
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }
    const slug = slugify(String(body.slug || name));
    insertData = {
      name,
      slug,
      description: body.description ? String(body.description).trim() : null,
      icon_name: body.icon_name ? String(body.icon_name).trim() : 'FileText',
      is_question_paper: Boolean(body.is_question_paper),
      is_short_note: Boolean(body.is_short_note),
      display_order: Number(body.display_order || 0),
      is_active: body.is_active !== false,
    };
    summaryLabel = name;
  }

  const { data: created, error } = await adminClient
    .from(entity)
    .insert(insertData)
    .select('*')
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message || `Failed to create ${entity}.` },
      { status: 400 }
    );
  }

  // Auto-generate semesters 1..total_semesters when creating a programme
  if (entity === 'programmes') {
    const total = Number(created.total_semesters || 6);
    const semRows = Array.from({ length: total }, (_, idx) => ({
      programme_id: created.id,
      semester_number: idx + 1,
      label: `Semester ${idx + 1}`,
      is_active: true,
    }));
    await adminClient.from('semesters').upsert(semRows, {
      onConflict: 'programme_id,semester_number',
      ignoreDuplicates: true,
    });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'CATEGORY_CREATED',
    entityType: entity,
    entityId: created.id,
    summary: `Created ${entity.replace('_', ' ')}: ${summaryLabel}.`,
  });

  dropTaxonomyCache();

  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const { entity } = await context.params;
  if (!ALLOWED_ENTITIES.has(entity)) {
    return NextResponse.json({ error: 'Unknown academic entity.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !body.id) {
    return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
  }

  const id = String(body.id);
  const updates = { ...body };
  delete updates.id;
  delete updates.created_at;
  delete updates.updated_at;

  const adminClient = createSupabaseAdminClient();
  const { data: updated, error } = await adminClient
    .from(entity)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || `Failed to update ${entity}.` },
      { status: 400 }
    );
  }

  if (entity === 'programmes' && updated.total_semesters) {
    const total = Number(updated.total_semesters);
    const semRows = Array.from({ length: total }, (_, idx) => ({
      programme_id: updated.id,
      semester_number: idx + 1,
      label: `Semester ${idx + 1}`,
      is_active: true,
    }));
    await adminClient.from('semesters').upsert(semRows, {
      onConflict: 'programme_id,semester_number',
      ignoreDuplicates: true,
    });
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'CATEGORY_UPDATED',
    entityType: entity,
    entityId: id,
    summary: `Updated ${entity.replace('_', ' ')} (${updated.name || updated.label || id}).`,
  });

  dropTaxonomyCache();

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const { entity } = await context.params;
  if (!ALLOWED_ENTITIES.has(entity)) {
    return NextResponse.json({ error: 'Unknown academic entity.' }, { status: 400 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from(entity).delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === '23503'
            ? 'Cannot delete this category while study materials are still linked to it. Reassign or remove dependent resources first.'
            : friendlyDbError(error, 'That update failed. Please try again.', 'admin'),
      },
      { status: 400 }
    );
  }

  await logAdminActivity({
    adminId: auth.profile.id,
    actionType: 'CATEGORY_DELETED',
    entityType: entity,
    entityId: id,
    summary: `Deleted record from ${entity.replace('_', ' ')}.`,
  });

  dropTaxonomyCache();

  return NextResponse.json({ ok: true });
}
