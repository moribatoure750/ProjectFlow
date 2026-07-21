import type { ReactNode } from "react";

export type BadgeTone = "gray" | "blue" | "green" | "red" | "orange" | "purple";

const tones: Record<BadgeTone, string> = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-amber-100 text-amber-700",
  purple: "bg-purple-100 text-purple-700",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "gray", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
