import type { ButtonHTMLAttributes, ReactNode } from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

/**
 * Button — primary interactive element of the Design System.
 *
 * Variants:
 *  - `primary`   : main call-to-action (brand accent, solid fill)
 *  - `secondary` : neutral outlined button, for secondary actions
 *  - `ghost`      : text-only, used inside toolbars / cards
 *  - `danger`     : destructive actions (delete, remove)
 *
 * Sizes: `sm` | `md` | `lg`
 *
 * States: `disabled`, `loading` (shows a spinner and disables interaction),
 * and accessible focus rings on keyboard navigation (`focus-visible`).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-md transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground hover:bg-accent-hover focus-visible:ring-ring shadow-sm",
        secondary:
          "bg-surface text-fg border border-border hover:bg-surface-hover focus-visible:ring-ring",
        ghost:
          "bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:ring-ring",
        danger:
          "bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-600 shadow-sm",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Icon rendered before the label. */
  icon?: ReactNode;
  /** Shows a spinner and disables the button while an action is pending. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  icon,
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}
