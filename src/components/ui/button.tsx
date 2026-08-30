import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-purple text-white hover:bg-purple-deep",
        secondary:
          "border border-border-strong/30 bg-transparent text-charcoal hover:border-purple hover:bg-purple/5",
        ghost: "text-slate hover:text-charcoal hover:bg-surface-muted",
        destructive: "bg-status-critical text-white hover:opacity-90",
        link: "text-purple underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 rounded-sm",
        sm: "h-8 px-3 text-[13px] rounded-sm",
        lg: "h-12 px-6 text-base rounded-sm",
        icon: "h-9 w-9 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export { buttonVariants };


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
