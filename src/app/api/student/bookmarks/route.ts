import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isStaffRole, requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const bookmarkSchema = z.object({
  resourceId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bookmarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid resource ID.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { resourceId } = parsed.data;

  // Verify resource is published and accessible
  const { data: resource } = await supabase
    .from('resources')
    .select('id, publication_status')
    .eq('id', resourceId)
    .maybeSingle();

  if (!resource || (resource.publication_status !== 'published' && !isStaffRole(auth.profile.role))) {
    return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', auth.profile.id)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id);
    return NextResponse.json({ ok: true, bookmarked: false });
  }

  const { error } = await supabase.from('bookmarks').insert({
    user_id: auth.profile.id,
    resource_id: resourceId,
  });

  if (error) {
    return NextResponse.json({ error: 'Could not save bookmark.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, bookmarked: true });
}
