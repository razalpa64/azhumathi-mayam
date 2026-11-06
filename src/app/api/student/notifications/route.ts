import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const markNotificationSchema = z.object({
  id: z.string().uuid().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = markNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid notification action.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  if (parsed.data.markAll) {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: nowIso })
      .eq('user_id', auth.profile.id)
      .eq('is_read', false);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.id) {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: nowIso })
      .eq('id', parsed.data.id)
      .eq('user_id', auth.profile.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Specify id or markAll.' }, { status: 400 });
}
