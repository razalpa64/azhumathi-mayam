import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiStaff } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const createSchema = z.object({
  subject_id: z.string().uuid('Please pick the subject.'),
  question: z.string().trim().min(5, 'Write the question (at least 5 characters).').max(1000),
  module: z.string().trim().max(60).optional().nullable(),
  topic: z.string().trim().max(120).optional().nullable(),
  years_asked: z.string().trim().max(60).optional().nullable(),
  times_asked: z.coerce.number().int().min(1).max(50).default(1),
});

/** Questions for one subject, most-repeated first. */
export async function GET(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const subjectId = request.nextUrl.searchParams.get('subjectId');
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('important_questions')
    .select('*')
    .eq('subject_id', subjectId)
    .order('times_asked', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not load questions.', 'admin') },
      { status: 400 }
    );
  }
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid question.' },
      { status: 400 }
    );
  }
  const payload = parsed.data;
  const adminClient = createSupabaseAdminClient();

  const { data: created, error } = await adminClient
    .from('important_questions')
    .insert({
      subject_id: payload.subject_id,
      question: payload.question,
      module: payload.module || null,
      topic: payload.topic || null,
      years_asked: payload.years_asked || null,
      times_asked: payload.times_asked,
      created_by: auth.profile.id,
    })
    .select('*')
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not save that question.', 'admin') },
      { status: 400 }
    );
  }
  return NextResponse.json({ item: created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing question id.' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from('important_questions').delete().eq('id', id);
  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not delete that question.', 'admin') },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
