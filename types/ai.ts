/**
 * Lot 19 — IA utile.
 *
 * Ce fichier ne contient que les types échangés entre le client et la
 * seule route serveur `app/api/ai/route.ts` : aucun chatbot, aucune
 * mémoire conversationnelle, aucun stockage. Chaque action produit un
 * résultat structuré et strictement typé, validé côté serveur avant
 * d'être renvoyé (voir `lib/ai/schemas.ts`).
 */

/** Les 3 seules actions IA autorisées dans ce lot — liste blanche
 *  vérifiée par `app/api/ai/route.ts`, jamais une chaîne libre. */
export type AiAction =
  | "generate_task_checklist"
  | "summarize_project"
  | "summarize_meeting";

/** Corps de la requête POST envoyée à `app/api/ai/route.ts` — toujours
 *  une action de la liste blanche et l'id de l'entité concernée
 *  (jamais de `user_id` : déterminé côté serveur via la session). */
export interface AiRequestBody {
  action: AiAction;
  entityId: string;
}

/** Réponse d'erreur uniforme renvoyée par la route IA. */
export interface AiErrorResponse {
  error: string;
}

/** Un élément de checklist proposé par l'IA — avant toute insertion,
 *  simplement un aperçu modifiable côté client. */
export interface GeneratedChecklistItem {
  content: string;
}

/** Résultat de `generate_task_checklist` — entre 3 et 8 éléments
 *  (validé par `lib/ai/schemas.ts`). */
export interface GenerateTaskChecklistResult {
  items: GeneratedChecklistItem[];
}

/** Résultat de `summarize_project` — toujours temporaire côté client,
 *  jamais stocké ni journalisé. */
export interface ProjectSummaryResult {
  summary: string;
  progress: string;
  risks: string[];
  nextActions: string[];
}

/** Résultat de `summarize_meeting` — toujours temporaire côté client,
 *  jamais stocké ni journalisé. */
export interface MeetingSummaryResult {
  summary: string;
  decisions: string[];
  actions: string[];
  openQuestions: string[];
}
