import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5',
  {
    variants: {
      variant: {
        burgundy: 'bg-burgundy-tint text-burgundy',
        solid: 'bg-burgundy text-paper',
        neutral: 'bg-neutral-soft text-charcoal/80',
        muted: 'bg-neutral-soft/70 text-muted',
        success: 'bg-[#eaf5ec] text-[#276749]',
        warning: 'bg-[#fdf3e0] text-[#8a5a12]',
        danger: 'bg-[#fbeae8] text-[#9b2318]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
