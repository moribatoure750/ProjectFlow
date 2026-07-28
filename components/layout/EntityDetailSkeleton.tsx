import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

/**
 * EntityDetailSkeleton — squelette de chargement commun aux trois pages
 * de détail (Lot 14A : /projects/[id], /tasks/[id], /meetings/[id]).
 *
 * Reproduit la structure "breadcrumb + titre + colonne principale (2/3)
 * + colonne latérale (1/3)" partagée par les trois pages, avec deux
 * points d'extension pour les différences observées :
 *  - `extraMainCard` : carte additionnelle sous la carte "Description"
 *    dans la colonne principale (utilisée par /projects/[id] pour la
 *    section "Tâches").
 *  - `sidebar` : contenu de la carte "Détails" en colonne latérale
 *    (par défaut une ligne simple ; /projects/[id] y passe le squelette
 *    de la barre de progression).
 */
export interface EntityDetailSkeletonProps {
  extraMainCard?: ReactNode;
  sidebar?: ReactNode;
}

export function EntityDetailSkeleton({
  extraMainCard,
  sidebar,
}: EntityDetailSkeletonProps) {
  return (
    <div>
      <LoadingSkeleton className="mb-4 h-4 w-40" />
      <LoadingSkeleton className="mb-6 h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-3 p-5">
            <LoadingSkeleton className="h-4 w-24" />
            <LoadingSkeleton className="h-4 w-full" />
            <LoadingSkeleton className="h-4 w-2/3" />
          </Card>
          {extraMainCard}
        </div>
        <Card className="space-y-3 p-5">
          <LoadingSkeleton className="h-4 w-24" />
          {sidebar ?? <LoadingSkeleton className="h-4 w-32" />}
        </Card>
      </div>
    </div>
  );
}
