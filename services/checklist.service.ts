import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";
import { logActivity } from "@/services/activity.service";

import type {
  ChecklistItem,
  ChecklistMoveDirection,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from "@/types/checklist";

/**
 * Service de la checklist des tâches (Lot 18), branché sur le journal
 * d'activité comme services/comments.service.ts.
 *
 * Ce service reste volontairement indépendant de tout autre service
 * métier (ProjectService, MeetingService, AttachmentService...) : il
 * n'en importe aucun, et rien ne l'importe encore en dehors de
 * hooks/useChecklist.ts. Seule exception : services/activity.service.ts
 * (`logActivity`) — effet secondaire "fire-and-forget", jamais une
 * condition de succès des opérations métier ci-dessous.
 *
 * Même pattern que services/comments.service.ts : un
 * `getRequiredUserId()` en première ligne de chaque opération, jamais
 * de `user_id` fourni par l'appelant, et un type d'erreur unifié
 * (`ChecklistServiceError`) quelle que soit la couche en échec.
 *
 * Le réordonnancement (`moveChecklistItem`) N'EST JAMAIS journalisé
 * (voir consigne du Lot 18) : ce n'est pas une action métier, juste un
 * ajustement de présentation.
 */

export type ChecklistServiceErrorCode =
  | "validation_error"
  | "unauthorized_entity"
  | "item_not_found"
  | "database_error";

export interface ChecklistServiceError {
  code: ChecklistServiceErrorCode;
  message: string;
  /** Détail technique (message PostgREST brut), utile pour le
   *  débogage — jamais nécessaire à afficher directement à
   *  l'utilisateur final. */
  details?: string;
}

export interface GetChecklistItemsResult {
  data: ChecklistItem[];
  error: ChecklistServiceError | null;
}

export interface ChecklistItemResult {
  data: ChecklistItem | null;
  error: ChecklistServiceError | null;
}

export interface ChecklistServiceResult {
  error: ChecklistServiceError | null;
}

/** Forme brute d'une ligne `task_checklists` telle que renvoyée par
 *  PostgREST (colonnes snake_case) — jamais exposée hors de ce fichier. */
interface ChecklistItemRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

function serviceError(
  code: ChecklistServiceErrorCode,
  message: string,
  details?: string
): ChecklistServiceError {
  return { code, message, details };
}

/** Traduit une erreur PostgREST (ou toute erreur porteuse d'un
 *  `.message`) en `ChecklistServiceError`, en conservant son message
 *  d'origine dans `details` — même logique que `fromUnknownError`
 *  (services/comments.service.ts). */
function fromUnknownError(
  fallbackMessage: string,
  error: { message: string }
): ChecklistServiceError {
  return serviceError("database_error", fallbackMessage, error.message);
}

/** Traduit une ligne brute `task_checklists` (snake_case) vers le type
 *  applicatif `ChecklistItem` (camelCase) — même pattern que
 *  `rowToComment`/`rowToAttachment`. */
function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    content: row.content,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Valide et normalise le libellé d'un élément côté client — même règle
 * que la contrainte SQL `task_checklists_content_not_blank_check`
 * (supabase/task_checklists.sql) : rejette une chaîne vide ou composée
 * uniquement d'espaces. Retourne le contenu "trim" prêt à être envoyé,
 * ou `null` si invalide.
 */
function normalizeContent(content: string): string | null {
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Vérifie que `taskId` appartient bien à l'utilisateur courant, avant
 * de lire/créer un élément de checklist sur cette tâche — même
 * principe que `assertOwnsEntity()` (services/attachments.service.ts).
 */
async function assertOwnsTask(
  taskId: string,
  userId: string
): Promise<ChecklistServiceError | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return fromUnknownError("Impossible de vérifier l'appartenance de la tâche.", error);
  }
  if (!data) {
    return serviceError("unauthorized_entity", "Tâche introuvable ou non autorisée.");
  }
  return null;
}

/**
 * Récupère les éléments de checklist d'une tâche donnée, pour
 * l'utilisateur courant, triés par position ascendante.
 *
 * Vérifie explicitement l'appartenance de la tâche via
 * `assertOwnsTask()` (plutôt que de s'appuyer uniquement sur la RLS +
 * un filtre renvoyant silencieusement une liste vide) — même choix que
 * `listAttachments()` (services/attachments.service.ts).
 */
export async function getChecklistItems(taskId: string): Promise<GetChecklistItemsResult> {
  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsTask(taskId, userId);
  if (ownershipCheckError) {
    return { data: [], error: ownershipCheckError };
  }

  const { data, error } = await supabase
    .from("task_checklists")
    .select("*")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .order("position", { ascending: true });

  if (error) {
    return {
      data: [],
      error: fromUnknownError("Impossible de charger la checklist.", error),
    };
  }

  return {
    data: ((data as ChecklistItemRow[] | null) ?? []).map(rowToChecklistItem),
    error: null,
  };
}

/**
 * Crée un nouvel élément de checklist, positionné après le dernier
 * élément existant de la tâche (ou en première position si la
 * checklist est vide). Journalise `checklist_item_created` une fois
 * l'insertion confirmée en base.
 */
export async function createChecklistItem(
  input: CreateChecklistItemInput
): Promise<ChecklistItemResult> {
  const normalized = normalizeContent(input.content);
  if (!normalized) {
    return {
      data: null,
      error: serviceError("validation_error", "Le libellé de l'élément ne peut pas être vide."),
    };
  }

  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsTask(input.taskId, userId);
  if (ownershipCheckError) {
    return { data: null, error: ownershipCheckError };
  }

  const { data: lastItem, error: maxError } = await supabase
    .from("task_checklists")
    .select("position")
    .eq("task_id", input.taskId)
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return {
      data: null,
      error: fromUnknownError(
        "Impossible de préparer la position du nouvel élément.",
        maxError
      ),
    };
  }

  const nextPosition = (lastItem?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("task_checklists")
    .insert({
      task_id: input.taskId,
      user_id: userId,
      content: normalized,
      position: nextPosition,
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: fromUnknownError("La création de l'élément a échoué.", error),
    };
  }

  const item = rowToChecklistItem(data as ChecklistItemRow);

  await logActivity("task", item.taskId, "checklist_item_created", {
    checklistItemId: item.id,
    content: item.content,
  });

  return { data: item, error: null };
}

/**
 * Modifie le libellé d'un élément existant — met à jour `updated_at`,
 * jamais de recréation de ligne. La RLS
 * (`task_checklists_update_own`) garantit qu'un utilisateur ne peut
 * modifier que ses propres éléments. Journalise
 * `checklist_item_updated` une fois la mise à jour confirmée en base.
 */
export async function updateChecklistItemContent(
  id: string,
  input: UpdateChecklistItemInput
): Promise<ChecklistItemResult> {
  const normalized = normalizeContent(input.content);
  if (!normalized) {
    return {
      data: null,
      error: serviceError("validation_error", "Le libellé de l'élément ne peut pas être vide."),
    };
  }

  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("task_checklists")
    .update({ content: normalized, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: fromUnknownError("La modification de l'élément a échoué.", error),
    };
  }

  const item = rowToChecklistItem(data as ChecklistItemRow);

  await logActivity("task", item.taskId, "checklist_item_updated", {
    checklistItemId: item.id,
    content: item.content,
  });

  return { data: item, error: null };
}

/**
 * Coche ou décoche un élément. Journalise `checklist_item_completed`
 * ou `checklist_item_uncompleted` selon la nouvelle valeur, une fois
 * la mise à jour confirmée en base — jamais les deux, jamais avant.
 */
export async function toggleChecklistItemCompleted(
  id: string,
  completed: boolean
): Promise<ChecklistItemResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("task_checklists")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: fromUnknownError("La mise à jour de l'élément a échoué.", error),
    };
  }

  const item = rowToChecklistItem(data as ChecklistItemRow);

  await logActivity(
    "task",
    item.taskId,
    completed ? "checklist_item_completed" : "checklist_item_uncompleted",
    { checklistItemId: item.id, content: item.content }
  );

  return { data: item, error: null };
}

/**
 * Supprime définitivement un élément de checklist. La RLS
 * (`task_checklists_delete_own`) garantit qu'un utilisateur ne peut
 * supprimer que ses propres éléments. Journalise
 * `checklist_item_deleted` une fois la suppression confirmée en base
 * — récupère d'abord `task_id`/`content` dans la même requête (perdus
 * après le `delete`), même logique que `deleteComment`
 * (services/comments.service.ts).
 */
export async function deleteChecklistItem(id: string): Promise<ChecklistServiceResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("task_checklists")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("task_id, content")
    .maybeSingle();

  if (error) {
    return { error: fromUnknownError("La suppression de l'élément a échoué.", error) };
  }
  if (!data) {
    return { error: serviceError("item_not_found", "Élément introuvable ou non autorisé.") };
  }

  await logActivity("task", data.task_id, "checklist_item_deleted", {
    checklistItemId: id,
    content: data.content,
  });

  return { error: null };
}

/**
 * Échange la position d'un élément avec son voisin immédiat
 * (haut/bas), à partir de la liste déjà triée fournie par l'appelant
 * (hooks/useChecklist.ts, qui la détient déjà en mémoire) — évite une
 * requête de relecture supplémentaire ici.
 *
 * Aucune journalisation (voir consigne du Lot 18) : un réordonnancement
 * n'est jamais une activité métier journalisée, contrairement aux
 * autres mutations de ce service.
 *
 * Si l'élément est déjà en première/dernière position selon la
 * direction demandée, ne fait rien et ne renvoie pas d'erreur (cas
 * normal, pas un échec).
 */
export async function moveChecklistItem(
  items: ChecklistItem[],
  id: string,
  direction: ChecklistMoveDirection
): Promise<ChecklistServiceResult> {
  const userId = await getRequiredUserId();

  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return { error: serviceError("item_not_found", "Élément introuvable ou non autorisé.") };
  }

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= items.length) {
    return { error: null };
  }

  const current = items[index];
  const neighbor = items[neighborIndex];

  const [currentUpdate, neighborUpdate] = await Promise.all([
    supabase
      .from("task_checklists")
      .update({ position: neighbor.position })
      .eq("id", current.id)
      .eq("user_id", userId),
    supabase
      .from("task_checklists")
      .update({ position: current.position })
      .eq("id", neighbor.id)
      .eq("user_id", userId),
  ]);

  const firstError = currentUpdate.error ?? neighborUpdate.error;
  if (firstError) {
    return {
      error: fromUnknownError("Le réordonnancement de l'élément a échoué.", firstError),
    };
  }

  return { error: null };
}
