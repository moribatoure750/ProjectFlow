import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  hoverable = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${
        hoverable ? "transition-shadow hover:shadow-md" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
