import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Badge — small status/category label. Tones map to the semantic color
 * scale defined in `app/globals.css`, so they automatically adapt to
 * Light/Dark mode.
 */
export type BadgeTone =
  | "gray"
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple";

const tones: Record<BadgeTone, string> = {
  gray: "bg-surface-hover text-fg-muted",
  blue: "bg-info-100 text-info-700 dark:bg-info-100/10 dark:text-info-600",
  green:
    "bg-success-100 text-success-700 dark:bg-success-100/10 dark:text-success-600",
  red: "bg-danger-100 text-danger-700 dark:bg-danger-100/10 dark:text-danger-600",
  orange:
    "bg-warning-100 text-warning-700 dark:bg-warning-100/10 dark:text-warning-600",
  purple:
    "bg-accent-soft text-accent-soft-foreground",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
