import type {
  GenerateTaskChecklistResult,
  MeetingSummaryResult,
  ProjectSummaryResult,
} from "@/types/ai";

/**
 * Lot 19 — IA utile : validation stricte des réponses IA avant de les
 * renvoyer au client. Aucune bibliothèque de validation externe
 * ajoutée : mêmes garde-fous manuels que le reste du projet (voir
 * `services/checklist.service.ts#normalizeContent`).
 *
 * Ces fonctions lèvent une exception (message utilisateur déjà prêt à
 * afficher) dès que la structure ne correspond pas exactement au
 * contrat attendu — jamais de valeur par défaut silencieuse qui
 * masquerait une réponse IA incohérente.
 */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("La réponse de l'IA n'est pas un JSON valide.");
  }
}

/** Valide/normalise la réponse de `generate_task_checklist` — entre 3
 *  et 8 éléments après filtrage des entrées invalides (voir consigne
 *  du Lot 19 : "génération de 3 à 8 éléments"). */
export function parseTaskChecklistResponse(raw: string): GenerateTaskChecklistResult {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object" || !("items" in parsed)) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  const rawItems = (parsed as { items: unknown }).items;
  if (!Array.isArray(rawItems)) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  const items = rawItems
    .map((item): { content: string } | null => {
      if (
        item &&
        typeof item === "object" &&
        isNonEmptyString((item as { content?: unknown }).content)
      ) {
        return { content: (item as { content: string }).content.trim() };
      }
      if (isNonEmptyString(item)) {
        return { content: item.trim() };
      }
      return null;
    })
    .filter((item): item is { content: string } => item !== null)
    .slice(0, 8);

  if (items.length < 3) {
    throw new Error("L'IA n'a pas généré suffisamment d'éléments valides (minimum 3).");
  }

  return { items };
}

/** Valide/normalise la réponse de `summarize_project`. */
export function parseProjectSummaryResponse(raw: string): ProjectSummaryResult {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.summary) ||
    !isNonEmptyString(obj.progress) ||
    !isStringArray(obj.risks) ||
    !isStringArray(obj.nextActions)
  ) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  return {
    summary: obj.summary.trim(),
    progress: obj.progress.trim(),
    risks: obj.risks.map((r) => r.trim()).filter((r) => r.length > 0),
    nextActions: obj.nextActions.map((r) => r.trim()).filter((r) => r.length > 0),
  };
}

/** Valide/normalise la réponse de `summarize_meeting`. */
export function parseMeetingSummaryResponse(raw: string): MeetingSummaryResult {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.summary) ||
    !isStringArray(obj.decisions) ||
    !isStringArray(obj.actions) ||
    !isStringArray(obj.openQuestions)
  ) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  return {
    summary: obj.summary.trim(),
    decisions: obj.decisions.map((r) => r.trim()).filter((r) => r.length > 0),
    actions: obj.actions.map((r) => r.trim()).filter((r) => r.length > 0),
    openQuestions: obj.openQuestions.map((r) => r.trim()).filter((r) => r.length > 0),
  };
}
