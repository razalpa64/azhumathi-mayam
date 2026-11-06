import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-55 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-burgundy text-canvas hover:bg-burgundy-dark border border-burgundy-dark/30',
        secondary:
          'bg-canvas text-charcoal border border-line-strong hover:bg-neutral-soft hover:border-charcoal/25',
        subtle: 'bg-neutral-soft text-charcoal border border-line hover:bg-neutral-inset',
        ghost: 'text-charcoal hover:bg-neutral-soft',
        danger: 'bg-[#991B1B] text-canvas hover:bg-[#7F1D1D] border border-[#7F1D1D]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm font-semibold',
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
