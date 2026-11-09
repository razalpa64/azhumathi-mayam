'use client';

import { ErrorState } from '@/components/errors/ErrorState';

/**
 * Segment boundary above the whole app. Reached when a layout fails (a page
 * error is caught closer to home by the `(student)` / `admin` boundaries, so
 * the shell survives). Retries once or twice before asking for help.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} />;
}
