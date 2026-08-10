/**
 * Assistant ProjectFlow — chatbot conversationnel (contrairement aux 3
 * actions IA « one-shot » du Lot 19, voir `types/ai.ts`). Ce fichier ne
 * contient que les types échangés entre le client et la route serveur
 * dédiée `app/api/ai/assistant/route.ts`.
 *
 * Aucune mémoire côté serveur : l'historique de conversation est géré
 * uniquement côté client (voir `hooks/useAssistant.ts`) et renvoyé à
 * chaque requête pour donner du contexte au modèle — jamais stocké en
 * base, jamais journalisé.
 */

export type AssistantRole = "user" | "assistant";

/** Un tour de conversation, tel qu'échangé avec la route serveur. */
export interface AssistantMessage {
  role: AssistantRole;
  content: string;
}

/** Corps de la requête POST envoyée à `app/api/ai/assistant/route.ts`. */
export interface AssistantRequestBody {
  message: string;
  history: AssistantMessage[];
}

/** Réponse de succès de la route assistant. */
export interface AssistantResponseBody {
  reply: string;
}

/** Réponse d'erreur uniforme renvoyée par la route assistant. */
export interface AssistantErrorResponse {
  error: string;
}
