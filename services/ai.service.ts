import type {
  AiAction,
  GenerateTaskChecklistResult,
  MeetingSummaryResult,
  ProjectSummaryResult,
} from "@/types/ai";

/**
 * Service IA (Lot 19), côté client : unique point d'accès à la route
 * serveur `app/api/ai/route.ts`. Aucun appel direct au fournisseur IA
 * depuis le navigateur — la clé API n'existe que côté serveur.
 *
 * Même forme de résultat que les autres services de ce projet
 * (`{ data, error }`), pour rester cohérent avec
 * services/checklist.service.ts / services/comments.service.ts.
 */

export interface AiServiceError {
  message: string;
}

export interface AiServiceResult<T> {
  data: T | null;
  error: AiServiceError | null;
}

async function callAiEndpoint<T>(
  action: AiAction,
  entityId: string
): Promise<AiServiceResult<T>> {
  let response: Response;
  try {
    response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entityId }),
    });
  } catch {
    return { data: null, error: { message: "Impossible de contacter le service IA." } };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "La génération IA a échoué.";
    return { data: null, error: { message } };
  }

  return { data: payload as T, error: null };
}

/** Génère un aperçu de checklist (3 à 8 éléments) pour une tâche — ne
 *  modifie jamais la checklist réelle : l'insertion reste à la charge
 *  de l'appelant, après confirmation explicite (voir
 *  components/checklist/AiChecklistGenerator.tsx). */
export async function generateTaskChecklist(
  taskId: string
): Promise<AiServiceResult<GenerateTaskChecklistResult>> {
  return callAiEndpoint<GenerateTaskChecklistResult>("generate_task_checklist", taskId);
}

/** Génère un résumé intelligent d'un projet — résultat toujours
 *  temporaire côté client, jamais stocké. */
export async function summarizeProject(
  projectId: string
): Promise<AiServiceResult<ProjectSummaryResult>> {
  return callAiEndpoint<ProjectSummaryResult>("summarize_project", projectId);
}

/** Génère un résumé intelligent d'une réunion — résultat toujours
 *  temporaire côté client, jamais stocké. */
export async function summarizeMeeting(
  meetingId: string
): Promise<AiServiceResult<MeetingSummaryResult>> {
  return callAiEndpoint<MeetingSummaryResult>("summarize_meeting", meetingId);
}
