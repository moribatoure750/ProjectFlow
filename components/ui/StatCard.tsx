import type { ReactNode } from "react";
import { Card } from "./Card";

/**
 * StatCard — compact metric display used on the dashboard
 * (e.g. "Projets actifs", "Tâches en cours").
 */
export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}

export function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <Card hoverable className="flex items-start gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-fg-muted">{label}</p>
        <p className="text-2xl font-semibold text-fg">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
      </div>
    </Card>
  );
}
