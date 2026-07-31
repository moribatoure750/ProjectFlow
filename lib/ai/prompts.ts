import type { AiPrompt } from "@/lib/ai/client";

/**
 * Lot 19 — IA utile : construction des prompts envoyés au fournisseur
 * IA pour chacune des 3 actions autorisées. Chaque prompt exige
 * explicitement une réponse JSON brute (sans texte additionnel, sans
 * balises Markdown) dans un format fixe, validé ensuite par
 * `lib/ai/schemas.ts` — aucune confiance aveugle dans le format
 * réellement renvoyé par le modèle.
 */

/** Génère 3 à 8 étapes concrètes pour réaliser une tâche donnée. */
export function buildTaskChecklistPrompt(
  title: string,
  description: string
): AiPrompt {
  const system =
    "Tu es un assistant qui aide des étudiants à décomposer une tâche académique en étapes concrètes et réalisables. Réponds uniquement avec un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown.";

  const user = `Tâche : "${title}"
Description : "${description || "(aucune description)"}"

Génère une checklist de 3 à 8 étapes concrètes et actionnables pour réaliser cette tâche. Chaque étape doit être courte (une phrase maximum).

Réponds strictement avec ce format JSON, sans aucun autre texte :
{"items": [{"content": "..."}, {"content": "..."}]}`;

  return { system, user };
}

export interface ProjectSummaryProjectInput {
  title: string;
  description: string | null;
  deadline: string;
  status: string;
}

export interface ProjectSummaryTaskInput {
  title: string;
  status: string;
  priority: string;
  due_date: string;
}

export interface ProjectSummaryMeetingInput {
  title: string;
  status: string;
  starts_at: string;
}

/** Synthétise l'état d'un projet à partir de ses tâches et réunions. */
export function buildProjectSummaryPrompt(
  project: ProjectSummaryProjectInput,
  tasks: ProjectSummaryTaskInput[],
  meetings: ProjectSummaryMeetingInput[]
): AiPrompt {
  const system =
    "Tu es un assistant qui aide à synthétiser l'état d'un projet académique à partir de ses tâches et réunions. Réponds uniquement avec un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown.";

  const taskLines =
    tasks
      .map((t) => `- [${t.status}] (priorité ${t.priority}) ${t.title} — échéance ${t.due_date}`)
      .join("\n") || "(aucune tâche)";

  const meetingLines =
    meetings.map((m) => `- [${m.status}] ${m.title} — ${m.starts_at}`).join("\n") ||
    "(aucune réunion)";

  const user = `Projet : "${project.title}"
Description : "${project.description || "(aucune description)"}"
Échéance du projet : ${project.deadline}
Statut : ${project.status}

Tâches :
${taskLines}

Réunions :
${meetingLines}

Fournis une synthèse de ce projet à partir de ces informations uniquement (n'invente aucun détail absent des données ci-dessus).

Réponds strictement avec ce format JSON, sans aucun autre texte :
{
  "summary": "résumé général en 2 à 4 phrases",
  "progress": "évaluation de la progression en 1 à 3 phrases",
  "risks": ["risque 1", "risque 2"],
  "nextActions": ["action 1", "action 2"]
}`;

  return { system, user };
}

export interface MeetingSummaryInput {
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

/** Synthétise une réunion à partir de son titre/description/notes. */
export function buildMeetingSummaryPrompt(meeting: MeetingSummaryInput): AiPrompt {
  const system =
    "Tu es un assistant qui aide à synthétiser une réunion académique à partir des informations disponibles. Réponds uniquement avec un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown.";

  const user = `Réunion : "${meeting.title}"
Description / notes : "${meeting.description || "(aucune description)"}"
Lieu : ${meeting.location || "(non précisé)"}
Début : ${meeting.starts_at}
Fin : ${meeting.ends_at}
Statut : ${meeting.status}

Fournis une synthèse de cette réunion à partir de ces informations uniquement. Si les notes sont absentes ou trop limitées pour identifier des décisions/actions/points à clarifier, indique-le explicitement dans les sections concernées (ex. liste vide) plutôt que d'inventer des détails.

Réponds strictement avec ce format JSON, sans aucun autre texte :
{
  "summary": "résumé en 2 à 4 phrases",
  "decisions": ["décision 1"],
  "actions": ["action à faire 1"],
  "openQuestions": ["point à clarifier 1"]
}`;

  return { system, user };
}
