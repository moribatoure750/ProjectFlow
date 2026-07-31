import { ProgressBar } from "@/components/ui/ProgressBar";

export interface ChecklistProgressProps {
  completedCount: number;
  totalCount: number;
  percent: number;
}

/**
 * ChecklistProgress — résumé "X / Y terminés" + barre de progression
 * (Lot 18), affiché au-dessus de la liste des éléments dans
 * `ChecklistSection`. N'affiche rien si la checklist est vide (pas de
 * pourcentage pertinent sur 0 élément) — `ChecklistItemList` affiche
 * déjà un message dédié dans ce cas.
 */
export function ChecklistProgress({
  completedCount,
  totalCount,
  percent,
}: ChecklistProgressProps) {
  if (totalCount === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
        <span>
          {completedCount} / {totalCount} terminé{completedCount > 1 ? "s" : ""}
        </span>
        <span>{percent}%</span>
      </div>
      <ProgressBar value={percent} label="Progression de la checklist" />
    </div>
  );
}
