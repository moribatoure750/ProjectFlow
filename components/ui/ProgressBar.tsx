import { cn } from "@/lib/utils";

/**
 * ProgressBar — horizontal progress indicator (e.g. task completion rate).
 *
 * `value` is clamped between 0 and 100. The fill transition is animated so
 * updates feel smooth rather than instantaneous.
 */
export interface ProgressBarProps {
  value: number;
  className?: string;
  /** Accessible label, e.g. "Taux de complétion". */
  label?: string;
}

export function ProgressBar({ value, className, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-surface-hover",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-all duration-slow ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
