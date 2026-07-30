/**
 * Commentaires (Lot 17A — infrastructure uniquement).
 *
 * Ce fichier ne contient que le modèle de données ; voir
 * services/comments.service.ts pour l'API (`getComments` /
 * `createComment` / `updateComment` / `deleteComment`), et le
 * Lot 17B pour un éventuel branchement vers le journal d'activité
 * (action `comment_added`, déjà présente dans la liste blanche
 * `activity_logs_action_check`, supabase/activity_logs.sql — pas
 * encore utilisée par ce lot).
 *
 * Même esprit que types/activity.ts et types/attachment.ts : un
 * modèle minimal, indépendant du nom des colonnes SQL (voir
 * supabase/comments.sql).
 */

/** Les 3 seules entités pouvant porter un commentaire dans ce lot —
 *  même ensemble que `ActivityEntityType`/`AttachmentEntityType`. */
export type CommentEntityType = "project" | "task" | "meeting";

/**
 * Représentation applicative d'une ligne `comments`, indépendante du
 * nom des colonnes SQL (camelCase ici, snake_case en base — voir
 * `services/comments.service.ts` pour la traduction dans les deux
 * sens, même pattern que `rowToActivity`/`rowToAttachment`).
 */
export interface Comment {
  id: string;
  userId: string;
  entityType: CommentEntityType;
  entityId: string;
  content: string;
  createdAt: string;
  /** Mise à jour à chaque modification — voir supabase/comments.sql. */
  updatedAt: string;
  /** `null` tant que le commentaire n'a jamais été modifié depuis sa
   *  création — seule condition d'affichage du badge "Modifié"
   *  (components/comments/CommentItem.tsx). */
  editedAt: string | null;
}

/** Entrée nécessaire à `createComment()`. */
export interface CreateCommentInput {
  entityType: CommentEntityType;
  entityId: string;
  content: string;
}

/** Entrée nécessaire à `updateComment()` — seul le contenu est
 *  modifiable dans ce lot (pas de changement d'entité cible). */
export interface UpdateCommentInput {
  content: string;
}
