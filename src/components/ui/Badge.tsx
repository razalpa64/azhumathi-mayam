import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        burgundy: 'bg-burgundy-tint text-burgundy border-burgundy-border',
        solid: 'bg-burgundy text-canvas border-burgundy',
        neutral: 'bg-neutral-soft text-charcoal border-line',
        muted: 'bg-canvas text-muted border-line',
        success: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
        warning: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
        danger: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
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
