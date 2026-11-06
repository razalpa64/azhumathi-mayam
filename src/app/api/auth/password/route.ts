import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long.')
      .max(128, 'New password is too long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match.',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const rate = checkRateLimit(`pwchange:${auth.profile.id}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rate.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid password input.' },
      { status: 400 }
    );
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { error: 'New password must be different from your current password.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Re-verify current password before allowing password change
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: auth.profile.auth_email,
    password: parsed.data.currentPassword,
  });

  if (verifyErr) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message || 'Failed to update password.' },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', auth.profile.id);

  return NextResponse.json({ ok: true, message: 'Password updated securely.' });
}
