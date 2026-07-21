import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Card — base surface container used across the app (stat cards, list
 * items, form containers, kanban cards, etc.).
 *
 * Props:
 *  - `hoverable` : lifts the card with a slightly stronger shadow on hover,
 *    used for clickable/interactive cards (e.g. project cards).
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface shadow-sm transition-shadow duration-150 ease-out",
        hoverable && "hover:shadow-md hover:border-border-strong",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
