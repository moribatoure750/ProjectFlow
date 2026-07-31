import type { ChecklistItem, ChecklistMoveDirection } from "@/types/checklist";

import { ChecklistItemRow } from "./ChecklistItemRow";

export interface ChecklistItemListProps {
  items: ChecklistItem[];
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDeleteRequest: (item: ChecklistItem) => void;
  onMove: (id: string, direction: ChecklistMoveDirection) => void;
}

/**
 * ChecklistItemList — liste ordonnée des éléments d'une checklist
 * (Lot 18), déjà triés par position ascendante par
 * `hooks/useChecklist.ts`. Affiche un message dédié si la checklist
 * est vide, plutôt qu'un `EmptyState` pleine largeur — la checklist
 * reste une sous-section discrète de la page de détail d'une tâche.
 */
export function ChecklistItemList({
  items,
  onToggle,
  onUpdate,
  onDeleteRequest,
  onMove,
}: ChecklistItemListProps) {
  if (items.length === 0) {
    return (
      <p className="py-3 text-sm text-fg-muted">
        Aucun élément dans cette checklist pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item, index) => (
        <ChecklistItemRow
          key={item.id}
          item={item}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDeleteRequest={onDeleteRequest}
          onMove={onMove}
        />
      ))}
    </ul>
  );
}
