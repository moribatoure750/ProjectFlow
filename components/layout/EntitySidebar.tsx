import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export interface EntitySidebarProps {
  title?: string;
  children: ReactNode;
}

/**
 * EntitySidebar — carte "Détails" de la colonne latérale des pages de
 * détail. Affichée en permanence quel que soit l'onglet `EntityTabs`
 * actif (Lot 14B) : elle porte le contexte de l'entité (échéance,
 * projet associé, priorité…), pas son contenu par onglet.
 *
 * Remplace le `<Card className="p-5"><h2>...</h2>...</Card>` dupliqué
 * à l'identique dans les trois pages de détail du Lot 14A.
 */
export function EntitySidebar({ title = "Détails", children }: EntitySidebarProps) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-base font-semibold text-fg">{title}</h2>
      {children}
    </Card>
  );
}
