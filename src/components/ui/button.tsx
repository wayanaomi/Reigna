import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-purple focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "overflow-hidden rounded-sm",
          "bg-purple text-white",
          "shadow-[0_8px_24px_rgba(39,23,64,0.18)]",
          "hover:-translate-y-0.5",
          "hover:bg-purple-deep",
          "hover:shadow-[0_12px_30px_rgba(39,23,64,0.24)]",
          "active:translate-y-0",
          "before:absolute before:inset-y-0 before:left-0 before:w-px",
          "before:bg-gold before:opacity-80",
        ].join(" "),

        secondary: [
          "rounded-sm",
          "border border-border-strong/20",
          "bg-surface text-charcoal",
          "shadow-sm",
          "hover:-translate-y-0.5",
          "hover:border-purple/50",
          "hover:bg-surface-muted",
          "hover:shadow-md",
          "active:translate-y-0",
        ].join(" "),

        ghost:
          "rounded-sm text-slate hover:bg-surface-muted hover:text-charcoal",

        destructive:
          "rounded-sm bg-status-critical text-white hover:opacity-90",

        link:
          "rounded-sm p-0 text-purple underline-offset-4 hover:underline",
      },

      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
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