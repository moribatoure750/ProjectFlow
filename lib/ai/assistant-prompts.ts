import { getDueDateTone } from "@/lib/due-date";
import type {
  AssistantContext,
  AssistantMeetingSummary,
  AssistantProjectSummary,
  AssistantTaskSummary,
} from "@/lib/ai/assistant-context";
import type { AssistantMessage } from "@/types/assistant";

/**
 * Assistant ProjectFlow — construction du prompt système/utilisateur
 * envoyé au fournisseur IA (via `lib/ai/client.ts#callAi`), sur le même
 * principe que `lib/ai/prompts.ts` (Lot 19) : tout le texte envoyé au
 * modèle est construit ici, à partir de données déjà vérifiées
 * appartenir à l'utilisateur courant (voir
 * `lib/ai/assistant-context.ts`).
 *
 * Contrairement aux actions du Lot 19, la réponse attendue n'est pas
 * du JSON mais du texte conversationnel brut — voir la consigne finale
 * du prompt utilisateur ci-dessous.
 */

const STATUS_LABELS: Record<string, string> = {
  todo: "à faire",
  doing: "en cours",
  done: "terminée",
  active: "actif",
  completed: "terminé",
  archived: "archivé",
  planned: "planifiée",
  completed_meeting: "terminée",
  cancelled: "annulée",
  low: "basse",
  medium: "moyenne",
  high: "haute",
};

function label(value: string): string {
  return STATUS_LABELS[value] ?? value;
}

/** Un projet "terminé"/"archivé" n'est jamais considéré en retard,
 *  même si son échéance est dépassée — même principe que
 *  `getDueDateTone` pour les tâches (voir `lib/due-date.ts`). */
function isProjectDone(status: string): boolean {
  return status === "completed" || status === "archived";
}

function formatProjects(
  projects: AssistantProjectSummary[],
  tasks: AssistantTaskSummary[]
): string {
  if (projects.length === 0) return "(aucun projet)";

  // Les projets en retard ou dont l'échéance est aujourd'hui sont mis
  // en avant en tête de liste, pour que l'IA les priorise naturellement
  // sans avoir à les rechercher dans une longue liste.
  const toneRank = { overdue: 0, today: 1, normal: 2 } as const;
  const sorted = [...projects].sort(
    (a, b) =>
      toneRank[getDueDateTone(a.deadline, isProjectDone(a.status))] -
      toneRank[getDueDateTone(b.deadline, isProjectDone(b.status))]
  );

  return sorted
    .map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const done = projectTasks.filter((t) => t.status === "done").length;
      const total = projectTasks.length;
      const progress = total > 0 ? `${done}/${total} tâches terminées` : "aucune tâche";
      const tone = getDueDateTone(project.deadline, isProjectDone(project.status));
      const flag =
        tone === "overdue" ? " (EN RETARD)" : tone === "today" ? " (échéance aujourd'hui)" : "";
      return `- "${project.title}" [${label(project.status)}] — échéance ${
        project.deadline || "non définie"
      }${flag} — ${progress}`;
    })
    .join("\n");
}

function formatTasks(tasks: AssistantTaskSummary[]): string {
  const active = tasks.filter((t) => t.status !== "done");
  if (active.length === 0) return "(aucune tâche active)";

  const sorted = [...active].sort((a, b) =>
    (a.due_date || "9999-99-99").localeCompare(b.due_date || "9999-99-99")
  );

  return sorted
    .slice(0, 40)
    .map((task) => {
      const tone = getDueDateTone(task.due_date, false);
      const flag = tone === "overdue" ? " (EN RETARD)" : tone === "today" ? " (aujourd'hui)" : "";
      const project = task.projectTitle ? ` [projet: ${task.projectTitle}]` : "";
      return `- ${task.title}${project} — priorité ${label(task.priority)} — échéance ${
        task.due_date || "non définie"
      }${flag}`;
    })
    .join("\n");
}

function formatMeetings(meetings: AssistantMeetingSummary[]): string {
  const relevant = meetings.filter((m) => m.status !== "cancelled");
  if (relevant.length === 0) return "(aucune réunion planifiée)";

  const sorted = [...relevant].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return sorted
    .slice(0, 20)
    .map((meeting) => {
      const project = meeting.projectTitle ? ` [projet: ${meeting.projectTitle}]` : "";
      return `- ${meeting.title}${project} — ${label(meeting.status)} — du ${meeting.starts_at} au ${meeting.ends_at}`;
    })
    .join("\n");
}

function formatHistory(history: AssistantMessage[]): string {
  if (history.length === 0) return "(aucun historique)";
  return history
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
    .join("\n");
}

/**
 * Prompt système — fixe, ne dépend jamais des données de l'utilisateur.
 * Définit explicitement le rôle, le style, les capacités attendues et
 * les contraintes de l'assistant conversationnel ProjectFlow.
 */
export function buildAssistantSystemPrompt(): string {
  return [
    "Rôle : tu es Assistant ProjectFlow, un assistant de gestion de projets académiques qui agit comme un chef de projet expérimenté et bienveillant pour l'utilisateur.",
    "Style : réponds toujours en français, avec un ton professionnel mais naturel et encourageant. Reste concis (quelques phrases ou une courte liste à puces) — jamais un pavé de texte.",
    "Capacités attendues : identifier les tâches et projets en retard, détecter des risques (échéances proches, surcharge de tâches, projets sans progression), proposer des priorités claires et argumentées, donner des conseils concrets, expliquer brièvement le raisonnement derrière une recommandation, et encourager sincèrement l'utilisateur sans excès.",
    "Contraintes : base-toi uniquement sur les données ProjectFlow fournies dans le message utilisateur (projets, tâches, réunions, historique). N'invente jamais d'information absente de ces données. Si la question ne peut pas être répondue avec les données disponibles, dis-le explicitement plutôt que de deviner.",
    "Ordre de priorité à appliquer quand c'est pertinent pour la question posée :",
    "1. les tâches et projets en retard",
    "2. les tâches de priorité haute",
    "3. les échéances proches (aujourd'hui ou dans les prochains jours)",
    "4. les réunions imminentes",
    "Format : réponds directement à la question posée, en texte brut (pas de JSON, pas de titres Markdown).",
  ].join("\n");
}

/**
 * Prompt utilisateur — contexte compact (projets/tâches/réunions),
 * historique de conversation (fourni par le client, jamais stocké
 * côté serveur) et nouveau message, avec une consigne finale explicite
 * de réponse en texte brut (pas de JSON, contrairement aux prompts du
 * Lot 19).
 */
export function buildAssistantUserPrompt(
  context: AssistantContext,
  history: AssistantMessage[],
  message: string
): string {
  return `Données ProjectFlow de l'utilisateur :

Projets :
${formatProjects(context.projects, context.tasks)}

Tâches actives :
${formatTasks(context.tasks)}

Réunions :
${formatMeetings(context.meetings)}

Historique de la conversation :
${formatHistory(history)}

Nouveau message de l'utilisateur : "${message}"

Réponds uniquement à ce nouveau message, en texte brut (pas de JSON, pas de balises Markdown), en tenant compte de l'historique et des données ci-dessus.`;
}
