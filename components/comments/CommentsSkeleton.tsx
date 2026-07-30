import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

/**
 * CommentsSkeleton — placeholder affiché pendant le premier
 * chargement des commentaires (voir `useComments().loading`). Mime la
 * forme d'un `CommentItem` (avatar rond + nom/date + 2 lignes de
 * texte), répétée 2 fois — même approche que `ActivitySkeleton`
 * (components/activity/ActivitySkeleton.tsx), jamais un blocage de
 * toute la page.
 */
function CommentSkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3">
      <LoadingSkeleton className="h-7 w-7 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <LoadingSkeleton className="h-3.5 w-24" />
          <LoadingSkeleton className="h-3 w-16" />
        </div>
        <LoadingSkeleton className="h-3.5 w-3/4" />
        <LoadingSkeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      <CommentSkeletonRow />
      <CommentSkeletonRow />
    </div>
  );
}
