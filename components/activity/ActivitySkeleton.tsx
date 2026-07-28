import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

/**
 * ActivitySkeleton — placeholder affiché pendant le premier
 * chargement du journal d'activité (voir `useActivity().loading`).
 * Mime la forme d'`ActivityItem` (icône ronde + badge + texte),
 * répétée 3 fois — même approche que `SkeletonListItem`
 * (components/ui/LoadingSkeleton.tsx) pour les listes tâches/réunions.
 */
function ActivitySkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3">
      <LoadingSkeleton className="h-9 w-9 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <LoadingSkeleton className="h-5 w-24 rounded-full" />
          <LoadingSkeleton className="h-3 w-20" />
        </div>
        <LoadingSkeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      <ActivitySkeletonRow />
      <ActivitySkeletonRow />
      <ActivitySkeletonRow />
    </div>
  );
}
