import type { AssistantMessage } from "@/types/assistant";

/**
 * Service Assistant ProjectFlow, côté client : unique point d'accès à
 * la route serveur `app/api/ai/assistant/route.ts`. Aucun appel direct
 * au fournisseur IA depuis le navigateur — la clé API n'existe que
 * côté serveur (voir `lib/ai/client.ts`).
 *
 * Même forme de résultat que `services/ai.service.ts` (Lot 19), pour
 * rester cohérent avec le reste du projet.
 */

export interface AssistantServiceError {
  message: string;
}

export interface AssistantServiceResult {
  data: string | null;
  error: AssistantServiceError | null;
}

/** Envoie un nouveau message à l'assistant, avec l'historique de la
 *  conversation en cours (géré uniquement côté client, voir
 *  `hooks/useAssistant.ts`) pour donner du contexte au modèle. */
export async function askAssistant(
  message: string,
  history: AssistantMessage[]
): Promise<AssistantServiceResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
  } catch {
    return { data: null, error: { message: "Impossible de contacter l'assistant." } };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "L'assistant n'a pas pu répondre.";
    return { data: null, error: { message } };
  }

  const reply =
    payload && typeof payload === "object" ? (payload as { reply?: unknown }).reply : null;

  if (typeof reply !== "string" || reply.trim().length === 0) {
    return { data: null, error: { message: "Réponse de l'assistant invalide." } };
  }

  return { data: reply, error: null };
}
