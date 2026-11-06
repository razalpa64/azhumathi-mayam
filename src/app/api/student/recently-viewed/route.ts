import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const viewSchema = z.object({
  resourceId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = viewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid resource ID.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { resourceId } = parsed.data;

  const { data: existing } = await supabase
    .from('recently_viewed')
    .select('id, view_count')
    .eq('user_id', auth.profile.id)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('recently_viewed')
      .update({
        viewed_at: new Date().toISOString(),
        view_count: (existing.view_count || 1) + 1,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('recently_viewed').insert({
      user_id: auth.profile.id,
      resource_id: resourceId,
      viewed_at: new Date().toISOString(),
      view_count: 1,
    });
  }

  return NextResponse.json({ ok: true });
}
