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
 * Actions connues au moment du Lot 16A, étendues par le Lot 16B
 * (attachment_added/attachment_removed) puis par le Lot 17B
 * (comment_created/comment_updated/comment_deleted, branchement des
 * commentaires vers le journal d'activité — voir
 * services/comments.service.ts). Liste blanche volontairement
 * restreinte (voir la contrainte `activity_logs_action_check`,
 * supabase/activity_logs.sql) plutôt qu'une chaîne libre : toute
 * extension future devra étendre à la fois cette union ET la
 * contrainte SQL correspondante, jamais l'une sans l'autre.
 *
 * `comment_added` (Lot 16A) reste présente pour ne jamais invalider
 * une éventuelle ligne existante portant cette valeur, même si plus
 * aucun service ne l'émet depuis le Lot 17B (qui utilise
 * `comment_created` à la place, plus cohérent avec
 * `created`/`updated`/`deleted`).
 *
 * Lot 18 : ajout des 5 actions émises par
 * services/checklist.service.ts pour la checklist des tâches
 * (`checklist_item_created`/`checklist_item_completed`/
 * `checklist_item_uncompleted`/`checklist_item_updated`/
 * `checklist_item_deleted`). Voir supabase/activity_logs.sql, Étape 4,
 * pour l'extension correspondante de la contrainte SQL.
 */
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "comment_added"
  | "comment_created"
  | "comment_updated"
  | "comment_deleted"
  | "attachment_added"
  | "attachment_removed"
  | "checklist_item_created"
  | "checklist_item_completed"
  | "checklist_item_uncompleted"
  | "checklist_item_updated"
  | "checklist_item_deleted";


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
