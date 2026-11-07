import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(100),
  university_id: z.string().uuid().nullable().optional(),
  programme_id: z.string().uuid().nullable().optional(),
  specialization_id: z.string().uuid().nullable().optional(),
  regulation_id: z.string().uuid().nullable().optional(),
  semester_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid profile data.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const payload = parsed.data;

  // Validate semester & specialization belong to selected programme when provided
  if (payload.programme_id && payload.semester_id) {
    const { data: sem } = await supabase
      .from('semesters')
      .select('id, programme_id')
      .eq('id', payload.semester_id)
      .maybeSingle();
    if (!sem || sem.programme_id !== payload.programme_id) {
      return NextResponse.json(
        { error: 'Selected semester does not belong to the chosen programme.' },
        { status: 400 }
      );
    }
  }

  if (payload.programme_id && payload.specialization_id) {
    const { data: spec } = await supabase
      .from('specializations')
      .select('id, programme_id')
      .eq('id', payload.specialization_id)
      .maybeSingle();
    if (!spec || spec.programme_id !== payload.programme_id) {
      return NextResponse.json(
        { error: 'Selected specialization does not belong to the chosen programme.' },
        { status: 400 }
      );
    }
  }

  // Strictly update only permitted student profile columns
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: payload.full_name,
      university_id: payload.university_id ?? null,
      programme_id: payload.programme_id ?? null,
      specialization_id: payload.programme_id ? payload.specialization_id ?? null : null,
      regulation_id: payload.regulation_id ?? null,
      semester_id: payload.programme_id ? payload.semester_id ?? null : null,
    })
    .eq('id', auth.profile.id);

  if (error) {
    return NextResponse.json({ error: friendlyDbError(error, 'Could not save your profile. Please try again.', 'student') || 'Failed to update profile.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: 'Profile updated.' });
}
