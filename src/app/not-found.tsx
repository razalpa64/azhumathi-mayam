import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 text-center">
      <BrandLogo size="md" />
      <p className="font-display mt-10 text-[15px] text-burgundy">404</p>
      <h1 className="font-display mt-2 text-[28px] font-medium text-charcoal">We couldn’t find that page</h1>
      <p className="mt-2 max-w-md text-sm text-muted leading-relaxed">
        It may have been moved, unpublished, or the link has a typo.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10.5 items-center justify-center rounded-lg bg-burgundy px-5 text-sm font-semibold text-paper hover:bg-burgundy-dark transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
