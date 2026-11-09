import { ArrowUpRight } from 'lucide-react';

/** Where the product credit points. Kept here so every footer agrees. */
export const INVYTRA_URL = 'https://www.invytra.in/';

/**
 * The INVYTRA product credit, in one place so the four footers on the site
 * (landing, student shell, sign-in, sign-up) can never drift apart.
 *
 * Deliberately quiet: it is a credit, not a call to action. Muted body text,
 * a burgundy link that only underlines on hover, and a small arrow to make it
 * obvious the click leaves the site.
 */
export function InvytraCredit({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`.trim()}>
      A product of{' '}
      <a
        href={INVYTRA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm font-medium text-burgundy/80 transition-colors hover:text-burgundy hover:underline hover:decoration-burgundy/40 hover:underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/40 focus-visible:ring-offset-2"
      >
        <span className="font-semibold tracking-[0.12em]">INVYTRA</span>{' '}
        <span className="font-normal">— Learn. Create. Celebrate.</span>
        <ArrowUpRight
          className="ml-0.5 inline h-3 w-3 align-[-0.125em] opacity-70"
          strokeWidth={2}
        />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
