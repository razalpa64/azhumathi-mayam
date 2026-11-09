import { NextResponse } from 'next/server';

/**
 * Landing spot for errors caught by the client boundaries.
 *
 * Without this, "it happens sometimes" has no evidence: the digest Next puts
 * on the server error never reaches anyone, and the browser console lives on
 * the student's phone. One console line per report is enough to match a
 * student's screenshot against the server logs.
 *
 * Deliberately tiny and unauthenticated: it must work on the day the app is
 * having its worst day. Nothing personal is stored — a digest, a truncated
 * message and the path.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      digest?: string | null;
      message?: string | null;
      path?: string | null;
    };

    console.error(
      '[client-error]',
      JSON.stringify({
        digest: (body.digest || '').slice(0, 120) || null,
        message: (body.message || '').slice(0, 300) || null,
        path: (body.path || '').slice(0, 200) || null,
        at: new Date().toISOString(),
      })
    );
  } catch {
    // Malformed body — nothing to log, nothing to break.
  }

  return new NextResponse(null, { status: 204 });
}
