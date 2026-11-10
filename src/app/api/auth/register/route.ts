import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeUsername, usernameToAuthEmail, validateUsernameFormat } from '@/lib/auth/username';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { sanitizeSpecializationId } from '@/lib/programme-branches-server';

const RESERVED_USERNAMES = new Set([
  'admin@invytra',
  'admin',
  'administrator',
  'superadmin',
  'root',
  'system',
  'support',
]);

const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Please enter your full name (at least 2 characters).')
      .max(100, 'Full name cannot exceed 100 characters.'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters.')
      .max(64, 'Username cannot exceed 64 characters.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .max(128, 'Password cannot exceed 128 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    university_id: z.string().uuid().nullable().optional(),
    programme_id: z.string().uuid().nullable().optional(),
    specialization_id: z.string().uuid().nullable().optional(),
    regulation_id: z.string().uuid().nullable().optional(),
    semester_id: z.string().uuid().nullable().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please check your registration details.' },
        { status: 400 }
      );
    }

    const usernameCheck = validateUsernameFormat(parsed.data.username);
    if (!usernameCheck.valid) {
      return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
    }

    const normalizedUsername = normalizeUsername(parsed.data.username);
    if (RESERVED_USERNAMES.has(normalizedUsername) || normalizedUsername.endsWith('@invytra')) {
      return NextResponse.json(
        { error: 'This username is reserved. Please choose a different student username.' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // The scheme decides which subjects the student sees, so a scheme from
    // another university would hand them an empty dashboard. The picker
    // cannot produce one; the API must not trust the client anyway.
    if (parsed.data.regulation_id) {
      const { data: regulation } = await adminClient
        .from('academic_regulations')
        .select('id, university_id, is_active')
        .eq('id', parsed.data.regulation_id)
        .maybeSingle();
      if (!regulation || regulation.is_active === false) {
        return NextResponse.json(
          { error: 'That regulation/scheme is no longer available. Please pick another.' },
          { status: 400 }
        );
      }
      if (
        regulation.university_id &&
        regulation.university_id !== (parsed.data.university_id ?? null)
      ) {
        return NextResponse.json(
          { error: 'That regulation/scheme belongs to a different university.' },
          { status: 400 }
        );
      }
    }

    // Check duplicate username
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: `Username "${normalizedUsername}" is already taken. Please pick another username.` },
        { status: 409 }
      );
    }

    const authEmail = usernameToAuthEmail(normalizedUsername);

    // Create Supabase Auth user
    const { data: authCreated, error: authErr } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        username: normalizedUsername,
        full_name: parsed.data.full_name,
        role: 'student',
      },
    });

    if (authErr || !authCreated.user) {
      return NextResponse.json(
        { error: authErr?.message || 'Unable to create your account right now. Please try again.' },
        { status: 400 }
      );
    }

    // Single-course degrees (BBA, BCA, LLB, …) have no branches; anything a
    // stale client sends for them is dropped rather than stored.
    const specializationId = await sanitizeSpecializationId(
      adminClient,
      parsed.data.programme_id,
      parsed.data.specialization_id
    );

    const nowIso = new Date().toISOString();

    // Create student profile strictly with role = 'student'
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .insert({
        id: authCreated.user.id,
        username: normalizedUsername,
        auth_email: authEmail,
        full_name: parsed.data.full_name,
        role: 'student',
        university_id: parsed.data.university_id || null,
        programme_id: parsed.data.programme_id || null,
        specialization_id: specializationId,
        regulation_id: parsed.data.regulation_id || null,
        semester_id: parsed.data.semester_id || null,
        is_active: true,
        must_change_password: false,
        last_login_at: nowIso,
      })
      .select('id, username, role')
      .single();

    if (profileErr || !profile) {
      await adminClient.auth.admin.deleteUser(authCreated.user.id);
      return NextResponse.json(
        { error: profileErr?.message || 'Failed to save your academic profile.' },
        { status: 400 }
      );
    }

    // Create welcome notification
    await adminClient.from('notifications').insert({
      user_id: profile.id,
      title: 'Welcome to അഴിമതി മയം',
      message:
        'Your student account has been created. You can update your programme, branch, or semester anytime in your Profile.',
      notification_type: 'account',
      link_url: '/dashboard/profile',
    });

    // Automatically sign the student in so session cookies are set immediately
    const supabase = await createSupabaseServerClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: parsed.data.password,
    });

    if (signInErr) {
      return NextResponse.json(
        {
          ok: true,
          role: 'student',
          requiresManualLogin: true,
          redirectTo: '/login?registered=1',
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        role: 'student',
        redirectTo: '/dashboard',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Unable to create your account right now. Please try again.' },
      { status: 500 }
    );
  }
}
