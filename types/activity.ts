/**
 * Journal d'activité (Lot 16A — infrastructure uniquement).
 *
 * Ce fichier ne contient que le modèle de données ; aucun service ne
 * journalise encore automatiquement quoi que ce soit — voir
 * services/activity.service.ts pour l'API prévue (`getActivities` /
 * `createActivity`), et le Lot 16B pour le branchement effectif dans
 * ProjectService/TaskService/MeetingService/AttachmentService.
 *
 * Même esprit que types/attachment.ts : un modèle minimal, indépendant
 * du nom des colonnes SQL (voir supabase/activity_logs.sql).
 */

/** Les 3 seules entités pouvant porter une activité dans ce lot — même
 *  ensemble que `AttachmentEntityType` (types/attachment.ts). */
export type ActivityEntityType = "project" | "task" | "meeting";

/**
 * Actions connues au moment du Lot 16A. Liste blanche volontairement
 * restreinte (voir la contrainte `activity_logs_action_check`,
 * supabase/activity_logs.sql) plutôt qu'une chaîne libre : le Lot 16B
 * devra étendre à la fois cette union ET la contrainte SQL
 * correspondante s'il a besoin de nouvelles valeurs, jamais l'une sans
 * l'autre.
 */
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "comment_added"
  | "attachment_added"
  | "attachment_removed";

/**
 * Représentation applicative d'une ligne `activity_logs`, indépendante
 * du nom des colonnes SQL (camelCase ici, snake_case en base — voir
 * `services/activity.service.ts` pour la traduction dans les deux
 * sens, même pattern que `rowToAttachment`).
 */
export interface Activity {
  id: string;
  userId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  /** Détails libres propres à chaque action (ex. ancien/nouveau statut,
   *  nom du fichier concerné...), jamais interprétés par ce type — voir
   *  `lib/activity-meta.ts` pour la dérivation d'une description
   *  affichable à partir de ce champ. */
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Entrée nécessaire à `createActivity()` — `metadata` reste optionnel
 *  côté appelant, la fonction applique `{}` par défaut. */
export interface CreateActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
}
