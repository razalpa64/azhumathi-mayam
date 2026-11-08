import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  subtitle?: string;
  className?: string;
}

export function BrandLogo({
  href,
  size = 'md',
  theme = 'light',
  subtitle,
  className,
}: BrandLogoProps) {
  const dimensions = {
    sm: { box: 'h-9 w-9 rounded-md', px: 36, title: 'text-base', sub: 'text-[11px]' },
    md: { box: 'h-10 w-10 rounded-md', px: 40, title: 'text-lg', sub: 'text-xs' },
    lg: { box: 'h-14 w-14 rounded-lg', px: 56, title: 'text-2xl', sub: 'text-xs' },
  }[size];

  const content = (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-burgundy-logo ring-1',
          theme === 'dark' ? 'ring-white/15' : 'ring-burgundy/15',
          dimensions.box
        )}
      >
        <Image
          src="/brand/logo.png"
          alt="അഴിമതി മയം"
          width={dimensions.px}
          height={dimensions.px}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            'font-logo font-bold leading-[1.45] tracking-tight',
            dimensions.title,
            theme === 'dark' ? 'text-canvas' : 'text-charcoal'
          )}
        >
          അഴിമതി മയം
        </span>
        {subtitle ? (
          <span
            className={cn(
              'mt-0.5 font-medium leading-none tracking-wide uppercase',
              dimensions.sub,
              theme === 'dark' ? 'text-canvas/65' : 'text-muted'
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy rounded-md">
        {content}
      </Link>
    );
  }

  return content;
}
