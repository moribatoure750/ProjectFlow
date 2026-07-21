import { cn } from "@/lib/utils";

/**
 * Spinner — small indeterminate loading indicator.
 * Used inside `Button` (loading state) and standalone for inline loading
 * feedback (e.g. next to a label while data refreshes).
 */
type SpinnerSize = "sm" | "md" | "lg";

const sizes: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-[3px]",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Accessible label announced to screen readers. */
  label?: string;
}

export function Spinner({
  size = "md",
  className,
  label = "Chargement en cours",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent opacity-80",
        sizes[size],
        className
      )}
    />
  );
}
