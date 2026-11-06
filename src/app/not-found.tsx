import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 text-center">
      <BrandLogo size="md" />
      <p className="mt-8 font-mono text-xs font-semibold uppercase tracking-widest text-burgundy">
        Error 404
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-charcoal">
        Page or Study Resource Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted leading-relaxed">
        The requested document or page may have been unpublished, moved, or does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-burgundy px-5 text-sm font-semibold text-canvas hover:bg-burgundy-dark transition-colors"
      >
        Return to Portal
      </Link>
    </div>
  );
}
