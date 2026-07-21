import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 ${
        compact ? "p-6" : "p-12"
      }`}
    >
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
