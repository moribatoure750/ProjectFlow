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

/** Normalise un tableau de chaînes : trim, retire les entrées vides et
 *  les doublons (comparaison insensible à la casse/aux espaces), sans
 *  jamais changer l'ordre des premières occurrences — utile pour les
 *  listes générées par l'IA (risques, recommandations, checklist...)
 *  qui peuvent contenir des reformulations redondantes. */
function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("La réponse de l'IA n'est pas un JSON valide.");
  }
}

/** Valide/normalise la réponse de `generate_task_checklist` — une
 *  checklist professionnelle de 6 à 15 éléments (voir la consigne du
 *  prompt système dans `lib/ai/prompts.ts`), dédupliquée et bornée à
 *  15 éléments même si le modèle en renvoie davantage. Le minimum de
 *  validation (4) reste légèrement inférieur à la cible du prompt (6)
 *  par robustesse : une checklist un peu plus courte reste utile,
 *  mieux vaut l'afficher qu'échouer entièrement. */
export function parseTaskChecklistResponse(raw: string): GenerateTaskChecklistResult {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object" || !("items" in parsed)) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  const rawItems = (parsed as { items: unknown }).items;
  if (!Array.isArray(rawItems)) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  const contents = rawItems
    .map((item): string | null => {
      if (
        item &&
        typeof item === "object" &&
        isNonEmptyString((item as { content?: unknown }).content)
      ) {
        return (item as { content: string }).content;
      }
      if (isNonEmptyString(item)) return item;
      return null;
    })
    .filter((item): item is string => item !== null);

  const items = dedupeStrings(contents)
    .slice(0, 15)
    .map((content) => ({ content }));

  if (items.length < 4) {
    throw new Error("L'IA n'a pas généré suffisamment d'éléments valides.");
  }

  return { items };
}

/** Valide/normalise la réponse de `summarize_project` — un rapport de
 *  suivi structuré (résumé, progression, points positifs, risques,
 *  recommandations, prochaines étapes, conclusion). Les listes vides
 *  sont acceptées (ex. aucun risque identifié) : seule l'absence pure
 *  et simple d'un champ attendu est rejetée. */
export function parseProjectSummaryResponse(raw: string): ProjectSummaryResult {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.summary) ||
    !isNonEmptyString(obj.progress) ||
    !isNonEmptyString(obj.conclusion) ||
    !isStringArray(obj.strengths) ||
    !isStringArray(obj.risks) ||
    !isStringArray(obj.recommendations) ||
    !isStringArray(obj.nextSteps)
  ) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  return {
    summary: obj.summary.trim(),
    progress: obj.progress.trim(),
    strengths: dedupeStrings(obj.strengths),
    risks: dedupeStrings(obj.risks),
    recommendations: dedupeStrings(obj.recommendations),
    nextSteps: dedupeStrings(obj.nextSteps),
    conclusion: obj.conclusion.trim(),
  };
}

/** Valide/normalise la réponse de `summarize_meeting` — un compte-rendu
 *  structuré (contexte, résumé, décisions, actions, responsables,
 *  points à clarifier, prochaine réunion conseillée). Les listes vides
 *  sont acceptées : l'IA doit explicitement indiquer l'absence
 *  d'information plutôt que d'inventer (voir `lib/ai/prompts.ts`). */
export function parseMeetingSummaryResponse(raw: string): MeetingSummaryResult {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.context) ||
    !isNonEmptyString(obj.summary) ||
    !isNonEmptyString(obj.nextMeetingSuggestion) ||
    !isStringArray(obj.decisions) ||
    !isStringArray(obj.actions) ||
    !isStringArray(obj.responsibles) ||
    !isStringArray(obj.openQuestions)
  ) {
    throw new Error("La réponse de l'IA ne correspond pas au format attendu.");
  }

  return {
    context: obj.context.trim(),
    summary: obj.summary.trim(),
    decisions: dedupeStrings(obj.decisions),
    actions: dedupeStrings(obj.actions),
    responsibles: dedupeStrings(obj.responsibles),
    openQuestions: dedupeStrings(obj.openQuestions),
    nextMeetingSuggestion: obj.nextMeetingSuggestion.trim(),
  };
}
