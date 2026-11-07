import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const createSchema = z.object({
  request_type: z
    .enum(['notes', 'question_paper', 'short_notes', 'cheat_sheet', 'syllabus', 'other'])
    .default('notes'),
  title: z.string().trim().min(3, 'Tell us what you need (at least 3 characters).').max(200),
  subject_text: z.string().trim().max(160).optional().nullable(),
  details: z.string().trim().max(1500).optional().nullable(),
});

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('resource_requests')
    .select('*')
    .eq('student_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: friendlyDbError(error, 'That did not go through. Please try again.', 'student') }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.profile.role === 'admin') {
    return NextResponse.json({ error: 'Only students can raise requests.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid request.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Gentle flood guard: max 10 open requests at a time
  const { count } = await supabase
    .from('resource_requests')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', auth.profile.id)
    .in('status', ['pending', 'in_progress']);
  if ((count || 0) >= 10) {
    return NextResponse.json(
      { error: 'You already have 10 open requests. We’ll get to them — one at a time.' },
      { status: 429 }
    );
  }

  const { data, error } = await supabase
    .from('resource_requests')
    .insert({
      student_id: auth.profile.id,
      request_type: parsed.data.request_type,
      title: parsed.data.title,
      subject_text: parsed.data.subject_text || null,
      details: parsed.data.details || null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: friendlyDbError(error, 'That did not go through. Please try again.', 'student') }, { status: 400 });
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
