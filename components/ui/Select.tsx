import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "./icons";

/**
 * Select — styled wrapper around the native `<select>` element.
 *
 * Kept native (not a custom listbox) to guarantee correct keyboard
 * behavior and screen reader support across browsers/devices.
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error = false, className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-md border bg-surface px-3 py-2.5 pr-9 text-sm text-fg outline-none transition-colors duration-150 ease-out",
          "focus:border-accent focus:ring-2 focus:ring-ring/20",
          error ? "border-danger-600" : "border-border",
          className
        )}
        aria-invalid={error || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}
