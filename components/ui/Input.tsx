import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Input — styled wrapper around the native `<input>` element.
 *
 * Kept as a native input (no custom listbox/behavior) to preserve full
 * keyboard and accessibility support out of the box.
 *
 * Props:
 *  - `icon`  : optional leading icon (e.g. search icon)
 *  - `error` : marks the field as invalid (red border + `aria-invalid`)
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: boolean;
}

export function Input({ icon, error = false, className, ...props }: InputProps) {
  if (icon) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-surface px-3 py-2.5 text-sm transition-colors duration-150 ease-out",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/20",
          error ? "border-danger-600" : "border-border",
          className
        )}
      >
        <span className="text-fg-subtle">{icon}</span>
        <input
          className="w-full bg-transparent text-fg outline-none placeholder:text-fg-subtle"
          aria-invalid={error || undefined}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={cn(
        "w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-fg outline-none transition-colors duration-150 ease-out placeholder:text-fg-subtle",
        "focus:border-accent focus:ring-2 focus:ring-ring/20",
        error ? "border-danger-600" : "border-border",
        className
      )}
      aria-invalid={error || undefined}
      {...props}
    />
  );
}
