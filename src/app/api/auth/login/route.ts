import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeUsername, usernameToAuthEmail, validateUsernameFormat } from '@/lib/auth/username';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.').max(64),
  password: z.string().min(1, 'Password is required.').max(256),
  remember: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`login:${ip}`, 15, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many sign-in attempts. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid credentials format.' },
        { status: 400 }
      );
    }

    const usernameCheck = validateUsernameFormat(parsed.data.username);
    if (!usernameCheck.valid) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const normalizedUsername = normalizeUsername(parsed.data.username);
    const adminClient = createSupabaseAdminClient();

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, username, auth_email, role, is_active, must_change_password')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (existingProfile && !existingProfile.is_active) {
      return NextResponse.json(
        {
          error: 'Your account is currently inactive. Please contact support.',
        },
        { status: 403 }
      );
    }

    const targetEmail = existingProfile?.auth_email || usernameToAuthEmail(normalizedUsername);

    const supabase = await createSupabaseServerClient();
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: parsed.data.password,
    });

    if (signInErr || !signInData.user) {
      return NextResponse.json(
        { error: 'Invalid username or password. Please check your credentials and try again.' },
        { status: 401 }
      );
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, username, role, is_active, must_change_password')
      .eq('id', signInData.user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Your account is currently inactive. Please contact support.' },
        { status: 403 }
      );
    }

    await adminClient
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id);

    const redirectTo = profile.role === 'admin' ? '/admin' : '/dashboard';

    return NextResponse.json({
      ok: true,
      role: profile.role,
      mustChangePassword: profile.must_change_password,
      redirectTo,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Unable to complete sign-in right now. Please try again.' },
      { status: 500 }
    );
  }
}
