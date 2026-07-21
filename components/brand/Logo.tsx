import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/**
 * ProjectFlow brand mark.
 *
 * Symbol: a rounded square with two overlapping "flow" arcs — evokes
 * connected projects/tasks moving forward, staying abstract enough to not
 * copy any existing product mark.
 *
 * Variants:
 *  - `compact` : symbol + name, used in the sidebar header and tight spaces.
 *  - `full`    : symbol + name + tagline, used on the homepage and future
 *    authentication screens.
 *  - `mark`    : symbol only (no text), for favicons-like usage.
 */
export type LogoVariant = "compact" | "full" | "mark";

export interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path
        d="M9 20c2.5 0 4-2 4-4.5S11.5 11 9 11"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M23 12c-2.5 0-4 2-4 4.5S21.5 21 23 21"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="13" cy="16" r="1.6" fill="white" />
      <circle cx="19" cy="16" r="1.6" fill="white" />
    </svg>
  );
}

export function Logo({ variant = "compact", className }: LogoProps) {
  if (variant === "mark") {
    return <LogoMark className={className} />;
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="min-w-0">
        <p className="font-semibold leading-tight tracking-tight text-fg">
          {BRAND.name}
        </p>
        {variant === "full" && (
          <p className="text-xs leading-tight text-fg-muted">
            {BRAND.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
