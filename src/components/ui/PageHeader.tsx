import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** The one page header used across the student app: serif title, one plain line under it. */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-medium text-charcoal sm:text-[32px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  hint?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

/** Quiet section heading: serif title left, a single text link right. No icons, no rules. */
export function SectionHeader({ title, hint, href, linkLabel, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <div className="flex items-baseline gap-2.5 min-w-0">
        <h2 className="font-display text-xl font-medium text-charcoal">{title}</h2>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </div>
      {href && linkLabel ? (
        <a
          href={href}
          className="shrink-0 text-[13px] font-medium text-burgundy hover:underline underline-offset-4"
        >
          {linkLabel} →
        </a>
      ) : null}
    </div>
  );
}
