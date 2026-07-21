import type { ReactNode } from "react";
import { Card } from "./Card";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}

export function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
    </Card>
  );
}
