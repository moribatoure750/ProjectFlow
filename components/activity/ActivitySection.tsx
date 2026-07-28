"use client";

import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { useActivity } from "@/hooks/useActivity";
import type { ActivityEntityType } from "@/types/activity";

import { ActivityList } from "./ActivityList";
import { ActivitySkeleton } from "./ActivitySkeleton";

export interface ActivitySectionProps {
  entityType: ActivityEntityType;
  entityId: string;
}

/**
 * ActivitySection — point d'entrée unique de l'onglet "Activité" des
 * pages de détail (Projet/Tâche/Réunion, Lot 16A). Instancie
 * `useActivity()` avec l'entité courante et affiche, selon l'état :
 *  - `ActivitySkeleton` pendant le tout premier chargement ;
 *  - un `Toast` d'erreur si le chargement a échoué ;
 *  - `ActivityList` (qui gère elle-même le cas vide via
 *    `ActivityEmptyState`) sinon.
 *
 * Même rôle qu'`AttachmentSection`
 * (components/attachments/AttachmentSection.tsx) pour les pièces
 * jointes : c'est le SEUL composant que les pages de détail doivent
 * monter, jamais `useActivity()`/`ActivityList` directement.
 *
 * Aucune activité n'est créée par ce composant : purement en lecture,
 * conformément à la portée du Lot 16A (aucune journalisation
 * automatique).
 */
export function ActivitySection({ entityType, entityId }: ActivitySectionProps) {
  const { activities, loading, error } = useActivity(entityType, entityId);

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-base font-semibold text-fg">Activité</h2>

      {loading ? (
        <ActivitySkeleton />
      ) : error ? (
        <Toast variant="error">{error}</Toast>
      ) : (
        <ActivityList activities={activities} />
      )}
    </Card>
  );
}
