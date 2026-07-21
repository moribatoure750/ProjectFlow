import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — placeholder shown when a list/section has no data yet
 * (e.g. no projects, no tasks, no search results).
 */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Compact variant used inside cards/columns instead of full pages. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-muted text-center animate-fade-in",
        compact ? "p-6" : "p-12",
        className
      )}
    >
      {icon && <div className="mb-3 text-fg-subtle">{icon}</div>}
      <p className="font-medium text-fg">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
