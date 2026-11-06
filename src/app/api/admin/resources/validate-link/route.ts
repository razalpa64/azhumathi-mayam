import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiAdmin } from '@/lib/auth/session';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';
import { checkRateLimit } from '@/lib/security/rate-limit';

const validateSchema = z.object({
  url: z.string().min(1, 'Please paste a Google Drive sharing link.').max(1024),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const rate = checkRateLimit(`validate-link:${auth.profile.id}`, 30, 5 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { valid: false, error: `Rate limit reached. Wait ${rate.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, error: parsed.error.issues[0]?.message || 'Invalid link input.' },
      { status: 400 }
    );
  }

  const result = await storageProvider.validateAndInspectLink(parsed.data.url);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
