'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-burgundy">
        Hmm.
      </p>
      <h2 className="mt-2 text-xl font-semibold text-charcoal">
        Something went wrong
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        Try again — if it keeps happening, let your administrator know.
      </p>
      <div className="mt-5">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
