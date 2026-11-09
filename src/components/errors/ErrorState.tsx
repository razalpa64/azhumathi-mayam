'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, RotateCw } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_URL } from '@/lib/support';

/**
 * Shared body for every error boundary in the app.
 *
 * Two things matter here, because the failures this replaces are almost
 * always transient — a blip between the server and Supabase, a cold
 * database, a function that timed out once:
 *
 *  1. **It retries on its own.** Waiting for a student to press a button
 *     over a hiccup that has already passed is a support ticket.
 *  2. **It retries a bounded number of times.** A dead database must not
 *     turn into an endless reload loop, so attempts are counted in
 *     sessionStorage and capped inside a short window.
 *
 * It also posts the digest to /api/client-error, so "sometimes" failures
 * leave a trail in the server logs instead of vanishing.
 */

const RETRY_KEY = 'azm_error_auto_retries';
const MAX_AUTO_RETRIES = 2;
const RETRY_WINDOW_MS = 20_000;

/** Reserve an automatic retry, or 0 when we've used them all up. */
function takeAutoRetry(): number {
  try {
    const raw = window.sessionStorage.getItem(RETRY_KEY);
    const now = Date.now();
    let count = 0;
    let firstAt = now;

    if (raw) {
      const parsed = JSON.parse(raw) as { count?: number; firstAt?: number };
      if (parsed.firstAt && now - parsed.firstAt < RETRY_WINDOW_MS) {
        count = parsed.count || 0;
        firstAt = parsed.firstAt;
      }
    }

    if (count >= MAX_AUTO_RETRIES) return 0;

    window.sessionStorage.setItem(
      RETRY_KEY,
      JSON.stringify({ count: count + 1, firstAt })
    );
    return count + 1;
  } catch {
    // Storage blocked (private mode, embedded webview): no automatic
    // retry rather than risking a loop we cannot count.
    return 0;
  }
}

function reportError(error: Error & { digest?: string }) {
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        digest: error?.digest || null,
        message: String(error?.message || '').slice(0, 500),
        path: window.location.pathname,
      }),
    }).catch(() => {});
  } catch {
    // Reporting must never make things worse.
  }
}

export function ErrorState({
  error,
  reset,
  compact = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** True inside the app shell, where the header and menubar already frame it. */
  compact?: boolean;
}) {
  const [autoRetrying, setAutoRetrying] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Keep the detail in the browser console for whoever is debugging, and
    // send the digest to the server so it survives the student's phone.
    console.error('Error boundary caught:', error);
    reportError(error);

    const attempt = takeAutoRetry();
    if (!attempt) return;

    setAutoRetrying(true);
    const timer = setTimeout(() => reset(), attempt === 1 ? 900 : 2600);
    return () => clearTimeout(timer);
  }, [error, reset]);

  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center px-4 py-16 text-center'
          : 'flex min-h-[65vh] flex-col items-center justify-center px-4 text-center'
      }
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-burgundy">
        {autoRetrying ? 'Reconnecting' : 'Hmm.'}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-charcoal">
        {autoRetrying ? 'One moment…' : 'Something went wrong'}
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        {autoRetrying
          ? 'Trying that again for you.'
          : 'We tried twice and it did not come back. Tap try again, or message us and we will sort it out.'}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-burgundy px-5 text-sm font-semibold text-white transition-colors hover:bg-burgundy-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 cursor-pointer"
        >
          <RotateCw className="h-4 w-4" strokeWidth={2.2} />
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-canvas px-5 text-sm font-semibold text-charcoal transition-colors hover:bg-neutral-inset focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 cursor-pointer"
        >
          Reload page
        </button>
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-burgundy hover:underline underline-offset-4"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
          WhatsApp {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>

      {error?.digest ? (
        <p className="mt-6 select-all font-mono text-[11px] text-muted/70">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
