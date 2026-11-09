'use client';

import { ErrorState } from '@/components/errors/ErrorState';

/** Keeps AdminShell (sidebar + account card) around a failed admin page. */
export default function AdminAreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} compact />;
}
