import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";

import type {
  Activity,
  ActivityAction,
  ActivityEntityType,
} from "@/types/activity";

/**
 * Service du journal d'activité (Lot 16A — architecture uniquement).
 *
 * Ce service reste volontairement indépendant de tout autre service
 * (ProjectService, TaskService, MeetingService, AttachmentService...) :
 * il n'importe rien d'eux, et rien ne l'importe encore en dehors de
 * `hooks/useActivity.ts`. Aucun appel à `createActivity()` n'est
 * déclenché automatiquement dans ce lot — voir le Lot 16B pour le
 * branchement effectif dans les services existants.
 *
 * Même pattern que services/attachments.service.ts : un
 * `getRequiredUserId()` en première ligne de chaque opération, jamais
 * de `user_id` fourni par l'appelant, et un type d'erreur unifié
 * (`ActivityServiceError`) quelle que soit la couche en échec.
 */

export type ActivityServiceErrorCode = "database_error";

export interface ActivityServiceError {
  code: ActivityServiceErrorCode;
  message: string;
  /** Détail technique (message PostgREST brut), utile pour le
   *  débogage — jamais nécessaire à afficher directement à
   *  l'utilisateur final. */
  details?: string;
}

export interface GetActivitiesResult {
  data: Activity[];
  error: ActivityServiceError | null;
}

export interface CreateActivityResult {
  data: Activity | null;
  error: ActivityServiceError | null;
}

/** Forme brute d'une ligne `activity_logs` telle que renvoyée par
 *  PostgREST (colonnes snake_case) — jamais exposée hors de ce fichier. */
interface ActivityRow {
  id: string;
  user_id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function serviceError(
  code: ActivityServiceErrorCode,
  message: string,
  details?: string
): ActivityServiceError {
  return { code, message, details };
}

/** Traduit une erreur PostgREST (ou toute erreur porteuse d'un
 *  `.message`) en `ActivityServiceError`, en conservant son message
 *  d'origine dans `details` — même logique que
 *  `fromUnknownError` (services/attachments.service.ts). */
function fromUnknownError(
  fallbackMessage: string,
  error: { message: string }
): ActivityServiceError {
  return serviceError("database_error", fallbackMessage, error.message);
}

/** Traduit une ligne brute `activity_logs` (snake_case) vers le type
 *  applicatif `Activity` (camelCase) — même pattern que
 *  `rowToAttachment` (services/attachments.service.ts). */
function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

/**
 * Récupère le journal d'activité d'une entité donnée, pour
 * l'utilisateur courant, du plus récent au plus ancien.
 *
 * Ne vérifie pas explicitement l'appartenance de l'entité référencée
 * (à la différence de `listAttachments`,
 * services/attachments.service.ts) : ce lot ne l'exige pas, et
 * `entity_id` n'a pas de FK vers projects/tasks/meetings (voir
 * supabase/activity_logs.sql). La RLS (`activity_logs_select_own`)
 * garantit déjà qu'aucune ligne d'un autre utilisateur n'est jamais
 * renvoyée.
 */
export async function getActivities(
  entityType: ActivityEntityType,
  entityId: string
): Promise<GetActivitiesResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: fromUnknownError("Impossible de charger le journal d'activité.", error),
    };
  }

  return {
    data: ((data as ActivityRow[] | null) ?? []).map(rowToActivity),
    error: null,
  };
}

/**
 * Enregistre une entrée d'activité. N'est appelée par AUCUN autre
 * service dans ce lot (Lot 16A) : cette fonction existe pour que le
 * Lot 16B puisse la brancher dans ProjectService/TaskService/
 * MeetingService/AttachmentService sans devoir modifier la signature
 * ni le comportement de ce service.
 *
 * `metadata` par défaut à `{}` plutôt que `undefined`, cohérent avec
 * la colonne `metadata jsonb not null default '{}'::jsonb`
 * (supabase/activity_logs.sql).
 */
export async function createActivity(
  entityType: ActivityEntityType,
  entityId: string,
  action: ActivityAction,
  metadata: Record<string, unknown> = {}
): Promise<CreateActivityResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      metadata,
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: fromUnknownError("L'enregistrement de l'activité a échoué.", error),
    };
  }

  return { data: rowToActivity(data as ActivityRow), error: null };
}

/**
 * Wrapper "fire-and-forget" autour de `createActivity()` — Lot 16B.
 *
 * C'est le SEUL point d'entrée que les autres services
 * (ProjectService/TaskService/MeetingService/AttachmentService)
 * doivent utiliser pour journaliser un évènement : aucun d'eux
 * n'écrit jamais directement dans `activity_logs`.
 *
 * Ne propage jamais d'erreur ni d'exception : la journalisation est
 * un effet secondaire, jamais une condition de succès de l'opération
 * métier appelante. Toute erreur (réseau, session expirée, RLS...)
 * est uniquement journalisée dans la console.
 */
export async function logActivity(
  entityType: ActivityEntityType,
  entityId: string,
  action: ActivityAction,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await createActivity(entityType, entityId, action, metadata);
    if (error) {
      console.error("[activity.service] Échec de la journalisation d'activité :", error);
    }
  } catch (unexpectedError) {
    console.error(
      "[activity.service] Erreur inattendue lors de la journalisation d'activité :",
      unexpectedError
    );
  }
}

