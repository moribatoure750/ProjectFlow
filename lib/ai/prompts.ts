import type { AiPrompt } from "@/lib/ai/client";

/**
 * Lot 19 — IA utile : construction des prompts envoyés au fournisseur
 * IA pour chacune des 3 actions autorisées. Chaque prompt exige
 * explicitement une réponse JSON brute (sans texte additionnel, sans
 * balises Markdown) dans un format fixe, validé ensuite par
 * `lib/ai/schemas.ts` — aucune confiance aveugle dans le format
 * réellement renvoyé par le modèle.
 *
 * Chaque prompt système définit explicitement : le rôle de l'IA, le
 * style de réponse attendu, ses contraintes (ne jamais inventer,
 * rester concis) et le format de sortie — pour des résultats
 * réellement exploitables plutôt que de simples listes génériques.
 */

/**
 * Génère une checklist professionnelle (6 à 15 étapes selon la
 * complexité de la tâche) : triée dans un ordre logique d'exécution,
 * sans doublon, précise et directement exploitable.
 */
export function buildTaskChecklistPrompt(
  title: string,
  description: string
): AiPrompt {
  const system =
    "Tu es un chef de projet expérimenté, rigoureux et pragmatique. Tu excelles dans la décomposition de tâches académiques complexes en étapes claires, ordonnées et directement exploitables par un étudiant. Réponds uniquement avec un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown.";

  const user = `Tâche : "${title}"
Description : "${description || "(aucune description)"}"

En tant que chef de projet expérimenté, décompose cette tâche en une checklist professionnelle.

Contraintes strictes :
- Entre 6 et 15 éléments, selon la complexité réelle de la tâche (une tâche simple peut n'en nécessiter que 6, une tâche complexe jusqu'à 15).
- Trie les éléments dans un ordre logique d'exécution, du premier au dernier.
- Aucun doublon ni reformulation redondante d'une même idée.
- Chaque élément doit être précis, concret et directement actionnable (jamais vague ou générique).
- Chaque élément doit tenir sur une seule ligne courte (pas de phrase longue).

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

/**
 * Génère un véritable rapport de suivi de projet (résumé, progression,
 * points positifs, risques, recommandations, prochaines étapes,
 * conclusion) à partir des tâches et réunions du projet.
 */
export function buildProjectSummaryPrompt(
  project: ProjectSummaryProjectInput,
  tasks: ProjectSummaryTaskInput[],
  meetings: ProjectSummaryMeetingInput[]
): AiPrompt {
  const system =
    "Tu es un chef de projet expérimenté qui rédige des rapports de suivi clairs et professionnels pour des projets académiques. Tu t'appuies strictement sur les données fournies, sans jamais inventer d'information absente. Réponds uniquement avec un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown.";

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

Rédige un rapport de suivi de projet structuré et professionnel, à partir de ces informations uniquement (n'invente aucun détail absent des données ci-dessus). Si une section ne peut pas être renseignée par manque d'information, renvoie une liste vide plutôt que d'inventer.

Le rapport doit couvrir, dans cet ordre :
- Résumé général de l'état du projet
- Évaluation de la progression
- Points positifs observés
- Risques identifiés
- Recommandations concrètes et actionnables
- Prochaines étapes à mener
- Conclusion courte

Réponds strictement avec ce format JSON, sans aucun autre texte :
{
  "summary": "résumé général en 2 à 4 phrases",
  "progress": "évaluation de la progression en 1 à 3 phrases",
  "strengths": ["point positif 1"],
  "risks": ["risque 1"],
  "recommendations": ["recommandation concrète 1"],
  "nextSteps": ["prochaine étape 1"],
  "conclusion": "conclusion en 1 à 2 phrases"
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

/**
 * Génère un véritable compte-rendu de réunion (contexte, résumé,
 * décisions, actions, responsables, points à clarifier, prochaine
 * réunion conseillée) — n'invente jamais d'information absente des
 * données fournies.
 */
export function buildMeetingSummaryPrompt(meeting: MeetingSummaryInput): AiPrompt {
  const system =
    "Tu es un assistant de direction qui rédige des comptes-rendus de réunion précis et fiables. Tu ne dois jamais inventer d'information : si une donnée est absente, indique-le clairement plutôt que de la supposer. Réponds uniquement avec un objet JSON valide, sans aucun texte avant ou après, sans balises Markdown.";

  const user = `Réunion : "${meeting.title}"
Description / notes : "${meeting.description || "(aucune description)"}"
Lieu : ${meeting.location || "(non précisé)"}
Début : ${meeting.starts_at}
Fin : ${meeting.ends_at}
Statut : ${meeting.status}

Rédige un compte-rendu structuré de cette réunion, strictement basé sur les informations ci-dessus. Si les notes sont absentes ou trop limitées pour identifier certaines sections (décisions, actions, responsables...), indique-le explicitement (ex. liste vide) plutôt que d'inventer des détails.

Le compte-rendu doit couvrir, dans cet ordre :
- Contexte de la réunion
- Résumé
- Décisions prises
- Actions à effectuer
- Responsables identifiés (si mentionnés dans les notes, sinon liste vide)
- Points à clarifier
- Une proposition de prochaine réunion, si pertinent

Réponds strictement avec ce format JSON, sans aucun autre texte :
{
  "context": "contexte en 1 à 2 phrases",
  "summary": "résumé en 2 à 4 phrases",
  "decisions": ["décision 1"],
  "actions": ["action à faire 1"],
  "responsibles": ["responsable identifié 1"],
  "openQuestions": ["point à clarifier 1"],
  "nextMeetingSuggestion": "proposition en 1 phrase, ou explication si non pertinent"
}`;

  return { system, user };
}
