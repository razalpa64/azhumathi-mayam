import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { friendlyDbError, isMissingSchemaError } from '@/lib/db-errors';
import { diffDateKeys, toDateKey } from '@/lib/study-plan';

const PLAN_SELECT = 'id, exam_date, daily_minutes, subject_ids, completed_keys, updated_at';

const savePlanSchema = z.object({
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Exam date must be yyyy-mm-dd.'),
  dailyMinutes: z.number().int().min(15).max(720),
  subjectIds: z.array(z.string().uuid()).min(1).max(60),
  completedKeys: z.array(z.string().max(120)).max(1000).default([]),
});

function planResponse(row: {
  exam_date: string;
  daily_minutes: number;
  subject_ids: string[];
  completed_keys: string[];
  updated_at: string;
}) {
  return {
    examDate: row.exam_date,
    dailyMinutes: row.daily_minutes,
    subjectIds: row.subject_ids || [],
    completedKeys: row.completed_keys || [],
    updatedAt: row.updated_at,
  };
}

/** The signed-in student's study plan inputs (or null), plus subject details. */
export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from('study_plans')
    .select(PLAN_SELECT)
    .eq('user_id', auth.profile.id)
    .maybeSingle();

  if (error) {
    // Table missing (migration 0022 not applied yet) reads as "no plan".
    if (isMissingSchemaError(error)) {
      return NextResponse.json({ plan: null, subjects: [] });
    }
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not load your study plan.') },
      { status: 500 }
    );
  }
  if (!row) return NextResponse.json({ plan: null, subjects: [] });

  const plan = planResponse(row);
  let subjects: { id: string; subject_code: string; name: string }[] = [];
  if (plan.subjectIds.length > 0) {
    const { data } = await supabase
      .from('subjects')
      .select('id, subject_code, name')
      .in('id', plan.subjectIds);
    subjects = (data || []).map((s) => ({
      id: s.id as string,
      subject_code: s.subject_code as string,
      name: s.name as string,
    }));
  }
  return NextResponse.json({ plan, subjects });
}

/** Create or replace the student's plan inputs. */
export async function PUT(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = savePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid study plan.' },
      { status: 400 }
    );
  }
  const { examDate, dailyMinutes, completedKeys } = parsed.data;
  const subjectIds = Array.from(new Set(parsed.data.subjectIds));

  const today = toDateKey(new Date());
  const daysLeft = diffDateKeys(today, examDate);
  if (Number.isNaN(daysLeft) || daysLeft < -1 || daysLeft > 400) {
    return NextResponse.json(
      { error: 'Pick an exam date within the next 400 days.' },
      { status: 400 }
    );
  }
  const supabase = await createSupabaseServerClient();

  // Every planned subject must be a real, published subject.
  const { data: found, error: subjectError } = await supabase
    .from('subjects')
    .select('id')
    .eq('publication_status', 'published')
    .in('id', subjectIds);
  if (subjectError) {
    return NextResponse.json(
      { error: friendlyDbError(subjectError, 'Could not verify your subjects.') },
      { status: 500 }
    );
  }
  if ((found || []).length !== subjectIds.length) {
    return NextResponse.json(
      { error: 'Some selected subjects are no longer available. Reload and try again.' },
      { status: 400 }
    );
  }

  const { data: row, error } = await supabase
    .from('study_plans')
    .upsert(
      {
        user_id: auth.profile.id,
        exam_date: examDate,
        daily_minutes: dailyMinutes,
        subject_ids: subjectIds,
        completed_keys: completedKeys,
      },
      { onConflict: 'user_id' }
    )
    .select(PLAN_SELECT)
    .single();

  if (error || !row) {
    return NextResponse.json(
      {
        error: friendlyDbError(
          error,
          'Could not save your study plan. Please try again.'
        ),
      },
      { status: isMissingSchemaError(error) ? 503 : 500 }
    );
  }
  return NextResponse.json({ plan: planResponse(row) });
}

/** Remove the student's plan. */
export async function DELETE() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('user_id', auth.profile.id);
  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not remove your study plan.') },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
