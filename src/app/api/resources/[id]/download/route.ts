import { NextResponse, type NextRequest } from 'next/server';
import { isStaffRole, requireApiAuth } from '@/lib/auth/session';
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

type RecordResult = {
  /** true when this call added a row to the download ledger */
  recorded: boolean;
  /** the count to show the student */
  downloadCount: number;
  /** true when the counter had to be written outside the RPC */
  degraded: boolean;
};

/**
 * Write the download event, then the counter.
 *
 * `record_resource_download()` is the atomic path: one statement inserts the
 * event (skipping a repeat inside the same five-minute bucket) and bumps
 * `resources.download_count` with it. It used to be fire-and-forget — the
 * result was destructured as `{ data }` with the error thrown away — so a
 * missing function, a stale PostgREST schema cache or a revoked EXECUTE left
 * the admin analytics page saying "No student downloads recorded yet" while
 * students kept downloading, with nothing anywhere to explain it.
 *
 * Now a failed call is logged, and the event is still recorded the long way
 * round: insert the ledger row, then bump the counter. The counter is the
 * only part that is not atomic on this path, which is why it stays a
 * fallback — 0030 repairs any drift from the ledger whenever it runs.
 */
async function recordDownload(
  resourceId: string,
  userId: string,
  userAgent: string | null,
  currentCount: number
): Promise<RecordResult> {
  const adminClient = createSupabaseAdminClient();
  const dedupeBucket = getFiveMinuteBucket();

  const rpc = await adminClient.rpc('record_resource_download', {
    p_resource_id: resourceId,
    p_user_id: userId,
    p_dedupe_bucket: dedupeBucket,
    p_user_agent: userAgent?.slice(0, 250) || null,
  });

  if (!rpc.error) {
    const recorded = Boolean(rpc.data);
    return {
      recorded,
      downloadCount: recorded ? currentCount + 1 : currentCount,
      degraded: false,
    };
  }

  const looksLikeMissingPrivilege =
    rpc.error.code === '42501' ||
    /row-level security|permission denied|not authorized/i.test(rpc.error.message);

  console.error(
    `[download] record_resource_download failed for resource ${resourceId} (${rpc.error.code || 'no code'}): ${rpc.error.message} — falling back to a direct ledger insert${
      looksLikeMissingPrivilege
        ? '. Permission was refused, which normally means SUPABASE_SECRET_KEY is missing or is a publishable key — check the deployment environment.'
        : ''
    }`
  );

  const insert = await adminClient.from('downloads').insert({
    resource_id: resourceId,
    user_id: userId,
    dedupe_bucket: dedupeBucket,
    user_agent: userAgent?.slice(0, 250) || null,
  });

  // 23505 = the unique (user_id, resource_id, dedupe_bucket) rule: this
  // student already counted for this resource in this bucket. Not a failure.
  if (insert.error && insert.error.code === '23505') {
    return { recorded: false, downloadCount: currentCount, degraded: true };
  }

  if (insert.error) {
    console.error(
      `[download] could not record a download event for resource ${resourceId} (${insert.error.code || 'no code'}): ${insert.error.message}`
    );
    return { recorded: false, downloadCount: currentCount, degraded: true };
  }

  const { data: updated, error: updateError } = await adminClient
    .from('resources')
    .update({ download_count: currentCount + 1 })
    .eq('id', resourceId)
    .select('download_count')
    .maybeSingle();

  if (updateError) {
    console.error(
      `[download] event recorded but the counter did not move for resource ${resourceId} (${updateError.code || 'no code'}): ${updateError.message}`
    );
    return { recorded: true, downloadCount: currentCount + 1, degraded: true };
  }

  const written = updated?.download_count;
  return {
    recorded: true,
    downloadCount: typeof written === 'number' ? written : currentCount + 1,
    degraded: true,
  };
}

async function resolveAndRecordDownload(
  resourceId: string,
  userId: string,
  isAdmin: boolean,
  userAgent: string | null
) {
  const supabase = await createSupabaseServerClient();
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .select('id, title, google_drive_file_id, file_type, publication_status, download_count')
    .eq('id', resourceId)
    .maybeSingle();

  if (resourceError) {
    console.error(
      `[download] could not read resource ${resourceId} (${resourceError.code || 'no code'}): ${resourceError.message}`
    );
    return { ok: false as const, status: 500, error: 'Could not read that document. Please try again.' };
  }

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

  const outcome = await recordDownload(
    resource.id,
    userId,
    userAgent,
    Number(resource.download_count || 0)
  );

  return {
    ok: true as const,
    urls,
    recorded: outcome.recorded,
    degraded: outcome.degraded,
    downloadCount: outcome.downloadCount,
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
    isStaffRole(auth.profile.role),
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
    isStaffRole(auth.profile.role),
    request.headers.get('user-agent')
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.redirect(result.urls.downloadUrl, { status: 302 });
}
