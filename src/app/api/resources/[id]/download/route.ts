import { NextResponse, type NextRequest } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';
import { checkRateLimit } from '@/lib/security/rate-limit';
import type { ResourceFileType } from '@/types/database';

function getFiveMinuteBucket(): string {
  const now = new Date();
  const bucketMin = Math.floor(now.getUTCMinutes() / 5) * 5;
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}-${bucketMin}`;
}

async function resolveAndRecordDownload(
  resourceId: string,
  userId: string,
  isAdmin: boolean,
  userAgent: string | null
) {
  const supabase = await createSupabaseServerClient();
  const { data: resource } = await supabase
    .from('resources')
    .select('id, title, google_drive_file_id, file_type, publication_status, download_count')
    .eq('id', resourceId)
    .maybeSingle();

  if (!resource) {
    return { ok: false as const, status: 404, error: 'Resource not found.' };
  }

  if (!isAdmin && resource.publication_status !== 'published') {
    return { ok: false as const, status: 403, error: 'This resource is not published.' };
  }

  let urls;
  try {
    urls = storageProvider.getResourceUrls(
      resource.google_drive_file_id,
      resource.file_type as ResourceFileType
    );
  } catch {
    return { ok: false as const, status: 400, error: 'Resource has an invalid Google Drive reference.' };
  }

  const adminClient = createSupabaseAdminClient();
  const bucket = getFiveMinuteBucket();
  const { data: incremented } = await adminClient.rpc('record_resource_download', {
    p_resource_id: resource.id,
    p_user_id: userId,
    p_dedupe_bucket: bucket,
    p_user_agent: userAgent?.slice(0, 250) || null,
  });

  const nextCount = (resource.download_count || 0) + (incremented ? 1 : 0);

  return {
    ok: true as const,
    urls,
    recorded: Boolean(incremented),
    downloadCount: nextCount,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const rate = checkRateLimit(`dl:${auth.profile.id}`, 40, 5 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Download rate limit reached. Try again in ${rate.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const result = await resolveAndRecordDownload(
    id,
    auth.profile.id,
    auth.profile.role === 'admin',
    request.headers.get('user-agent')
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    downloadUrl: result.urls.downloadUrl,
    openUrl: result.urls.openUrl,
    recorded: result.recorded,
    downloadCount: result.downloadCount,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await resolveAndRecordDownload(
    id,
    auth.profile.id,
    auth.profile.role === 'admin',
    request.headers.get('user-agent')
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.redirect(result.urls.downloadUrl, { status: 302 });
}
