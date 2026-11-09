'use client';

import { ErrorState } from '@/components/errors/ErrorState';

/**
 * Renders *inside* StudentShell, so a page that fails keeps the header, the
 * tab strip and the menubar — the student can walk away instead of being
 * stranded on a blank page.
 */
export default function StudentAreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} compact />;
}
