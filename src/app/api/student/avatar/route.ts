import { NextResponse, type NextRequest } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const file = formData.get('avatar');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Please select an image file.' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, or WEBP profile images are permitted.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Profile image must be smaller than 2 MB.' },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filePath = `avatars/${auth.profile.id}/profile-${Date.now()}.${ext}`;
  const adminClient = createSupabaseAdminClient();

  const { error: uploadErr } = await adminClient.storage
    .from('platform-media')
    .upload(filePath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: uploadErr.message || 'Failed to upload profile picture.' },
      { status: 500 }
    );
  }

  const { data: pub } = adminClient.storage.from('platform-media').getPublicUrl(filePath);

  await adminClient
    .from('profiles')
    .update({ avatar_url: pub.publicUrl })
    .eq('id', auth.profile.id);

  return NextResponse.json({ ok: true, avatarUrl: pub.publicUrl });
}
