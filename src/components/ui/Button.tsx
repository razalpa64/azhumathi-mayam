import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-burgundy text-paper hover:bg-burgundy-dark shadow-[0_1px_2px_rgba(83,0,0,0.25)]',
        secondary:
          'bg-paper text-charcoal border border-line-strong hover:border-charcoal/30 hover:bg-neutral-soft',
        subtle: 'bg-neutral-soft text-charcoal hover:bg-neutral-inset',
        ghost: 'text-charcoal hover:bg-neutral-soft',
        danger: 'bg-[#991B1B] text-paper hover:bg-[#7F1D1D]',
      },
      size: {
        sm: 'h-8.5 px-3.5 text-[13px]',
        md: 'h-10 px-4.5 text-sm',
        lg: 'h-11.5 px-6 text-[15px] font-semibold',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
