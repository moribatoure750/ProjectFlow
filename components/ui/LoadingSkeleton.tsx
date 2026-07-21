import { cn } from "@/lib/utils";

/**
 * LoadingSkeleton — shimmering placeholder block used while data is being
 * fetched, instead of a plain "Chargement..." text. Replace ad-hoc loading
 * text across pages with this component (or `SkeletonCard`/`SkeletonList`
 * for common composite layouts).
 */
export interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-hover",
        className
      )}
    >
      <div className="animate-shimmer absolute inset-0" />
    </div>
  );
}

/** Skeleton mimicking a `StatCard` while dashboard stats are loading. */
export function SkeletonStatCard() {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5">
      <LoadingSkeleton className="h-11 w-11 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <LoadingSkeleton className="h-3 w-20" />
        <LoadingSkeleton className="h-6 w-12" />
      </div>
    </div>
  );
}

/** Skeleton mimicking a list row (project/task item) while loading. */
export function SkeletonListItem() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
      <div className="min-w-0 flex-1 space-y-2">
        <LoadingSkeleton className="h-4 w-2/3" />
        <LoadingSkeleton className="h-3 w-1/3" />
      </div>
      <LoadingSkeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  );
}
