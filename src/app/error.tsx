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
        System Error
      </p>
      <h2 className="mt-2 text-xl font-semibold text-charcoal">
        Something went wrong while loading this view
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        Please try reloading the section. If the problem persists, contact your administrator.
      </p>
      <div className="mt-5">
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
