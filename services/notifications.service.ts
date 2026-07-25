import { daysBetween } from "@/lib/meeting-grouping";
import { cleanStatus } from "@/lib/format";
import { getMeetings } from "@/services/meetings.service";
import { getProjects } from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import type { MeetingWithProject } from "@/types/meeting";
import type { AppNotification, NotificationCategory } from "@/types/notification";
import type { Project } from "@/types/project";
import type { TaskWithProject } from "@/types/task";

/**
 * Service de notifications calculées (Lot 10A).
 *
 * Aucune table `notifications`, aucun trigger, aucune policy : tout est
 * dérivé à la volée de `projects`/`tasks`/`meetings.service.ts`, déjà
 * filtrés par utilisateur (ownership applicatif + RLS du Lot 8).
 */

/** Fenêtre "tâche bientôt due" : 1 à N jours (exclut aujourd'hui, déjà
 *  couvert par `task_due_today`, et le retard, déjà couvert par
 *  `task_overdue`). */
export const TASK_DUE_SOON_WINDOW_DAYS = 3;

/** Fenêtre "échéance de projet proche" : 0 à N jours. Non spécifiée par
 *  la demande initiale — valeur par défaut, isolée ici pour rester
 *  facilement ajustable. */
export const PROJECT_DEADLINE_WINDOW_DAYS = 7;

/** Ordre d'urgence utilisé pour le tri et le regroupement par catégorie
 *  (page `/notifications`) — validé explicitement par le donneur
 *  d'ordre : retard > aujourd'hui (tâches) > réunion du jour > échéance
 *  de projet > bientôt dû. */
export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  "task_overdue",
  "task_due_today",
  "meeting_today",
  "project_deadline",
  "task_due_soon",
];

/**
 * Calcule les notifications actives à partir des données déjà chargées
 * — fonction pure, sans appel réseau, pour rester testable isolément
 * (même esprit que `lib/meeting-grouping.ts`).
 *
 * Chaque entité ne produit jamais plus d'une notification : les
 * fenêtres de date (retard / aujourd'hui / bientôt) sont mutuellement
 * exclusives par construction (if/else if), donc aucun chevauchement
 * possible pour les tâches ; projets et réunions sont des entités
 * distinctes évaluées indépendamment.
 *
 * Exclusions strictes :
 *  - tâches sans `due_date` ou déjà "done" ;
 *  - réunions sans `starts_at` ou dont le statut n'est pas "planned"
 *    (exclut donc "cancelled" ET "completed") ;
 *  - projets sans `deadline` ou dont le statut n'est pas "active".
 */
export function computeNotifications(
  projects: Project[],
  tasks: TaskWithProject[],
  meetings: MeetingWithProject[],
  now: Date = new Date()
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const task of tasks) {
    if (!task.due_date) continue;
    if (cleanStatus(task.status) === "done") continue;

    const due = new Date(task.due_date);
    if (Number.isNaN(due.getTime())) continue;

    const diff = daysBetween(now, due);
    const projectLabel = task.projects?.title ?? "Sans projet";
    const message = `${task.title} — ${projectLabel}`;

    if (diff < 0) {
      notifications.push({
        id: `task_overdue-${task.id}`,
        category: "task_overdue",
        message,
        date: task.due_date,
        href: "/tasks",
      });
    } else if (diff === 0) {
      notifications.push({
        id: `task_due_today-${task.id}`,
        category: "task_due_today",
        message,
        date: task.due_date,
        href: "/tasks",
      });
    } else if (diff <= TASK_DUE_SOON_WINDOW_DAYS) {
      notifications.push({
        id: `task_due_soon-${task.id}`,
        category: "task_due_soon",
        message,
        date: task.due_date,
        href: "/tasks",
      });
    }
  }

  for (const meeting of meetings) {
    if (!meeting.starts_at) continue;
    if (meeting.status !== "planned") continue;

    const start = new Date(meeting.starts_at);
    if (Number.isNaN(start.getTime())) continue;

    if (daysBetween(now, start) === 0) {
      const projectLabel = meeting.projects?.title ?? "Sans projet";
      notifications.push({
        id: `meeting_today-${meeting.id}`,
        category: "meeting_today",
        message: `${meeting.title} — ${projectLabel}`,
        date: meeting.starts_at,
        href: "/meetings",
      });
    }
  }

  for (const project of projects) {
    if (!project.deadline) continue;
    if (project.status !== "active") continue;

    const deadline = new Date(project.deadline);
    if (Number.isNaN(deadline.getTime())) continue;

    const diff = daysBetween(now, deadline);
    if (diff >= 0 && diff <= PROJECT_DEADLINE_WINDOW_DAYS) {
      notifications.push({
        id: `project_deadline-${project.id}`,
        category: "project_deadline",
        message: project.title,
        date: project.deadline,
        href: "/projects",
      });
    }
  }

  return notifications.sort((a, b) => {
    const orderDiff =
      NOTIFICATION_CATEGORY_ORDER.indexOf(a.category) -
      NOTIFICATION_CATEGORY_ORDER.indexOf(b.category);
    if (orderDiff !== 0) return orderDiff;

    // Ordre croissant par date au sein d'une même catégorie : pour les
    // tâches en retard, les plus anciennes (donc les plus en retard)
    // apparaissent en premier — comportement volontaire.
    if (a.date !== b.date) return a.date.localeCompare(b.date);

    // Critère secondaire stable en cas d'égalité de date.
    return a.message.localeCompare(b.message);
  });
}

export interface GetNotificationsResult {
  data: AppNotification[];
  /** `true` si au moins une des trois sources (projets/tâches/réunions)
   *  n'a pas pu être chargée — les notifications sont alors calculées
   *  avec les données disponibles uniquement, jamais bloquantes. */
  hasPartialFailure: boolean;
}

/** Journalise une source en échec en développement uniquement, sans
 *  jamais interrompre le calcul des notifications. */
function logSourceFailure(source: string, reason: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[notifications] échec du chargement (${source})`, reason);
  }
}

/**
 * Récupère et calcule les notifications de l'utilisateur courant.
 *
 * Utilise `Promise.allSettled` (jamais `Promise.all`) : si une des
 * trois sources échoue, les deux autres sont quand même exploitées —
 * le centre de notifications ne doit jamais être entièrement
 * indisponible à cause d'une seule source en erreur.
 */
export async function getNotifications(
  now: Date = new Date()
): Promise<GetNotificationsResult> {
  const [projectsResult, tasksResult, meetingsResult] = await Promise.allSettled([
    getProjects(),
    getTasks(),
    getMeetings(),
  ]);

  let hasPartialFailure = false;

  let projects: Project[] = [];
  if (projectsResult.status === "fulfilled" && !projectsResult.value.error) {
    projects = projectsResult.value.data;
  } else {
    hasPartialFailure = true;
    logSourceFailure(
      "projets",
      projectsResult.status === "rejected"
        ? projectsResult.reason
        : projectsResult.value.error
    );
  }

  let tasks: TaskWithProject[] = [];
  if (tasksResult.status === "fulfilled" && !tasksResult.value.error) {
    tasks = tasksResult.value.data;
  } else {
    hasPartialFailure = true;
    logSourceFailure(
      "tâches",
      tasksResult.status === "rejected" ? tasksResult.reason : tasksResult.value.error
    );
  }

  let meetings: MeetingWithProject[] = [];
  if (meetingsResult.status === "fulfilled" && !meetingsResult.value.error) {
    meetings = meetingsResult.value.data;
  } else {
    hasPartialFailure = true;
    logSourceFailure(
      "réunions",
      meetingsResult.status === "rejected"
        ? meetingsResult.reason
        : meetingsResult.value.error
    );
  }

  return {
    data: computeNotifications(projects, tasks, meetings, now),
    hasPartialFailure,
  };
}
