import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

/** Une ligne de repli pendant le chargement — case + libellé, même
 *  gabarit que la ligne réelle (`ChecklistItemRow`). */
function ChecklistSkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <LoadingSkeleton className="h-4 w-4 shrink-0 rounded" />
      <LoadingSkeleton className="h-4 flex-1" />
    </div>
  );
}

/**
 * ChecklistSkeleton — remplace le texte "Chargement..." pendant le
 * tout premier chargement de la checklist d'une tâche (Lot 18), même
 * rôle que `CommentsSkeleton`/`ActivitySkeleton`.
 */
export function ChecklistSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      <ChecklistSkeletonRow />
      <ChecklistSkeletonRow />
      <ChecklistSkeletonRow />
    </div>
  );
}
