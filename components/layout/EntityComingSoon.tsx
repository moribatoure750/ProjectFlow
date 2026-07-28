import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export interface EntityComingSoonProps {
  icon: ReactNode;
  title: string;
}

/**
 * EntityComingSoon — placeholder partagé par les onglets "Pièces
 * jointes", "Commentaires" et "Historique" des trois pages de détail
 * (Lot 14B). Aucune donnée réelle n'est chargée ni affichée : ces
 * fonctionnalités sont prévues pour un lot ultérieur — voir
 * types/attachment.ts et services/attachments.service.ts pour l'API
 * déjà en place côté pièces jointes, pas encore branchée à l'UI.
 */
export function EntityComingSoon({ icon, title }: EntityComingSoonProps) {
  return (
    <Card className="p-5">
      <EmptyState
        compact
        icon={icon}
        title={title}
        description="Cette fonctionnalité arrivera dans un prochain lot."
      />
    </Card>
  );
}
