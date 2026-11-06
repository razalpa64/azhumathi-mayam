import { NextResponse, type NextRequest } from 'next/server';
import { requireApiAdmin } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_NOTICE_FILES: Record<string, { ext: string; kind: 'image' | 'pdf' }> = {
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/png': { ext: 'png', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'application/pdf': { ext: 'pdf', kind: 'pdf' },
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Please choose an image or PDF file.' }, { status: 400 });
  }

  const meta = ALLOWED_NOTICE_FILES[file.type];
  if (!meta) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WEBP images or PDF attachments are supported.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Notice attachment must be 5 MB or smaller.' },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeBase = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 48);
  const storagePath = `notices/${Date.now()}-${safeBase || 'attachment'}.${meta.ext}`;

  const adminClient = createSupabaseAdminClient();
  const { error: uploadErr } = await adminClient.storage
    .from('platform-media')
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = adminClient.storage.from('platform-media').getPublicUrl(storagePath);

  return NextResponse.json({
    ok: true,
    attachmentUrl: pub.publicUrl,
    attachmentType: meta.kind,
    attachmentName: file.name,
  });
}
