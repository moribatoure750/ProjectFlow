import { EmptyState } from "@/components/ui/EmptyState";
import { ClockIcon } from "@/components/ui/icons";

/**
 * ActivityEmptyState — affiché quand une entité n'a encore aucune
 * activité enregistrée (Lot 16A : le cas normal pour TOUTES les
 * entités, puisqu'aucune journalisation automatique n'existe encore —
 * voir le Lot 16B).
 *
 * `ClockIcon` (components/ui/icons.tsx) plutôt qu'un emoji littéral :
 * reste cohérent avec le reste du Design System, où chaque
 * `EmptyState` utilise un SVG du même jeu d'icônes (voir
 * components/attachments/AttachmentList.tsx pour le même pattern).
 */
export function ActivityEmptyState() {
  return (
    <EmptyState
      compact
      icon={<ClockIcon className="h-6 w-6" />}
      title="Aucune activité"
      description="Les actions réalisées sur cet élément apparaîtront ici."
    />
  );
}
