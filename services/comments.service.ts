import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";
import { logActivity } from "@/services/activity.service";

import type {
  Comment,
  CommentEntityType,
  CreateCommentInput,
  UpdateCommentInput,
} from "@/types/comment";

/**
 * Service des commentaires (Lot 17A, branché sur le journal
 * d'activité au Lot 17B).
 *
 * Ce service reste volontairement indépendant de tout autre service
 * métier (ProjectService, TaskService, MeetingService,
 * AttachmentService...) : il n'en importe aucun, et rien ne l'importe
 * encore en dehors de `hooks/useComments.ts`. Seule exception :
 * `services/activity.service.ts` (`logActivity`), au même titre que
 * services/attachments.service.ts — la journalisation reste un effet
 * secondaire "fire-and-forget", jamais une condition de succès de
 * `createComment`/`updateComment`/`deleteComment` (voir `logActivity`,
 * qui n'expose d'ailleurs aucune erreur à l'appelant).
 *
 * Même pattern que services/activity.service.ts /
 * services/attachments.service.ts : un `getRequiredUserId()` en
 * première ligne de chaque opération, jamais de `user_id` fourni par
 * l'appelant, et un type d'erreur unifié (`CommentServiceError`)
 * quelle que soit la couche en échec.
 */

export type CommentServiceErrorCode = "validation_error" | "database_error";

export interface CommentServiceError {
  code: CommentServiceErrorCode;
  message: string;
  /** Détail technique (message PostgREST brut), utile pour le
   *  débogage — jamais nécessaire à afficher directement à
   *  l'utilisateur final. */
  details?: string;
}

export interface GetCommentsResult {
  data: Comment[];
  error: CommentServiceError | null;
}

export interface CommentResult {
  data: Comment | null;
  error: CommentServiceError | null;
}

export interface DeleteCommentResult {
  error: CommentServiceError | null;
}

/** Forme brute d'une ligne `comments` telle que renvoyée par
 *  PostgREST (colonnes snake_case) — jamais exposée hors de ce fichier. */
interface CommentRow {
  id: string;
  user_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
}

function serviceError(
  code: CommentServiceErrorCode,
  message: string,
  details?: string
): CommentServiceError {
  return { code, message, details };
}

/** Traduit une erreur PostgREST (ou toute erreur porteuse d'un
 *  `.message`) en `CommentServiceError`, en conservant son message
 *  d'origine dans `details` — même logique que `fromUnknownError`
 *  (services/activity.service.ts). */
function fromUnknownError(
  fallbackMessage: string,
  error: { message: string }
): CommentServiceError {
  return serviceError("database_error", fallbackMessage, error.message);
}

/** Traduit une ligne brute `comments` (snake_case) vers le type
 *  applicatif `Comment` (camelCase) — même pattern que
 *  `rowToActivity`/`rowToAttachment`. */
function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
  };
}

/**
 * Valide et normalise le contenu d'un commentaire côté client — même
 * règle que la contrainte SQL `comments_content_not_blank_check`
 * (supabase/comments.sql) : rejette une chaîne vide ou composée
 * uniquement d'espaces. Retourne le contenu "trim" prêt à être
 * envoyé, ou `null` si invalide. Défense en profondeur : même si ce
 * contrôle échouait à être appelé, la contrainte SQL refuserait
 * quand même l'insertion/la mise à jour.
 */
function normalizeContent(content: string): string | null {
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Récupère les commentaires d'une entité donnée, pour l'utilisateur
 * courant, du plus récent au plus ancien — même ordre que
 * `getActivities()` (services/activity.service.ts).
 *
 * La RLS (`comments_select_own`) garantit déjà qu'aucune ligne d'un
 * autre utilisateur n'est jamais renvoyée.
 */
export async function getComments(
  entityType: CommentEntityType,
  entityId: string
): Promise<GetCommentsResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: fromUnknownError("Impossible de charger les commentaires.", error),
    };
  }

  return {
    data: ((data as CommentRow[] | null) ?? []).map(rowToComment),
    error: null,
  };
}

/**
 * Publie un nouveau commentaire sur une entité. Journalise
 * `comment_created` (Lot 17B) une fois l'insertion confirmée en base
 * — jamais avant, et jamais si l'insertion a échoué.
 */
export async function createComment(input: CreateCommentInput): Promise<CommentResult> {
  const normalized = normalizeContent(input.content);
  if (!normalized) {
    return {
      data: null,
      error: serviceError("validation_error", "Le commentaire ne peut pas être vide."),
    };
  }

  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      content: normalized,
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: fromUnknownError("La publication du commentaire a échoué.", error),
    };
  }

  const comment = rowToComment(data as CommentRow);

  await logActivity(comment.entityType, comment.entityId, "comment_created", {
    commentId: comment.id,
  });

  return { data: comment, error: null };
}

/**
 * Modifie le contenu d'un commentaire existant — met à jour
 * `updated_at` ET `edited_at` (voir supabase/comments.sql), jamais de
 * recréation de ligne. La RLS (`comments_update_own`) garantit qu'un
 * utilisateur ne peut modifier que ses propres commentaires.
 * Journalise `comment_updated` (Lot 17B) une fois la mise à jour
 * confirmée en base.
 */
export async function updateComment(
  id: string,
  input: UpdateCommentInput
): Promise<CommentResult> {
  const normalized = normalizeContent(input.content);
  if (!normalized) {
    return {
      data: null,
      error: serviceError("validation_error", "Le commentaire ne peut pas être vide."),
    };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("comments")
    .update({ content: normalized, updated_at: now, edited_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: fromUnknownError("La modification du commentaire a échoué.", error),
    };
  }

  const comment = rowToComment(data as CommentRow);

  await logActivity(comment.entityType, comment.entityId, "comment_updated", {
    commentId: comment.id,
  });

  return { data: comment, error: null };
}

/**
 * Supprime définitivement un commentaire. La RLS
 * (`comments_delete_own`) garantit qu'un utilisateur ne peut
 * supprimer que ses propres commentaires. Journalise
 * `comment_deleted` (Lot 17B) une fois la suppression confirmée en
 * base — récupère d'abord la ligne pour connaître `entity_type`/
 * `entity_id` (perdus après le `delete`), même logique que
 * `deleteAttachment` (services/attachments.service.ts).
 */
export async function deleteComment(id: string): Promise<DeleteCommentResult> {
  const { data: existing } = await supabase
    .from("comments")
    .select("entity_type, entity_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) {
    return { error: fromUnknownError("La suppression du commentaire a échoué.", error) };
  }

  if (existing) {
    const row = existing as Pick<CommentRow, "entity_type" | "entity_id">;
    await logActivity(row.entity_type, row.entity_id, "comment_deleted", {
      commentId: id,
    });
  }

  return { error: null };
}
