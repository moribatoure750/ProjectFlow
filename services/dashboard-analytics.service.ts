import { getLocalDayKey } from "@/lib/date-utils";
import { cleanStatus } from "@/lib/format";
import { daysBetween, getWeekRange } from "@/lib/meeting-grouping";
import { getMeetings } from "@/services/meetings.service";
import { getProjects } from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import type { MeetingWithProject } from "@/types/meeting";
import type { Project } from "@/types/project";
import type { TaskWithProject } from "@/types/task";
import type {
  ChartDatum,
  DashboardAnalytics,
  ProjectProgressItem,
  TimeSeriesPoint,
} from "@/types/dashboard-analytics";

/**
 * Service du Dashboard analytique (Lot 11) — aucune table, aucun
 * trigger : tout est dérivé à la volée de
 * `projects`/`tasks`/`meetings.service.ts`, déjà filtrés par
 * utilisateur. Le Dashboard (`app/(app)/page.tsx`) ne fait qu'afficher
 * le résultat, jamais de calcul de métrique dans la page elle-même.
 */

/** Nombre de jours affichés dans `upcomingWorkload` (aujourd'hui inclus). */
const WORKLOAD_WINDOW_DAYS = 7;

/** Nombre de semaines affichées dans `weeklyActivity`. */
const ACTIVITY_WINDOW_WEEKS = 8;

/**
 * Calcule les métriques du Dashboard à partir des données déjà
 * chargées — fonction pure, sans appel réseau, testable isolément
 * (même esprit que `computeNotifications` du Lot 10A).
 *
 * Toutes les dates invalides ou manquantes sont ignorées silencieusement
 * (`Number.isNaN` / vérifications de nullité) — jamais d'exception.
 */
export function computeDashboardAnalytics(
  projects: Project[],
  tasks: TaskWithProject[],
  meetings: MeetingWithProject[],
  now: Date = new Date()
): DashboardAnalytics {
  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  const tasksTodo = tasks.filter((t) => cleanStatus(t.status) === "todo");
  const tasksInProgress = tasks.filter((t) => cleanStatus(t.status) === "doing");
  const tasksDone = tasks.filter((t) => cleanStatus(t.status) === "done");

  // --- Charge à venir (7 prochains jours, aujourd'hui inclus) ----------
  // Les 7 jours sont pré-remplis à 0 pour que les jours sans échéance
  // apparaissent honnêtement comme des barres vides, jamais omis.
  const workloadDays: { key: string; label: string }[] = [];
  const workloadCounts = new Map<string, number>();
  for (let i = 0; i < WORKLOAD_WINDOW_DAYS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = getLocalDayKey(d);
    const label = d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric" });
    workloadDays.push({ key, label });
    workloadCounts.set(key, 0);
  }

  let overdueTasks = 0;
  let dueSoon7Days = 0;

  for (const task of tasks) {
    if (cleanStatus(task.status) === "done") continue;
    if (!task.due_date) continue;

    const due = new Date(task.due_date);
    if (Number.isNaN(due.getTime())) continue;

    const diff = daysBetween(now, due);
    if (diff < 0) {
      overdueTasks += 1;
    } else if (diff < WORKLOAD_WINDOW_DAYS) {
      dueSoon7Days += 1;
      const key = getLocalDayKey(due);
      if (workloadCounts.has(key)) {
        workloadCounts.set(key, (workloadCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const upcomingWorkload: TimeSeriesPoint[] = workloadDays.map(({ key, label }) => ({
    key,
    label,
    value: workloadCounts.get(key) ?? 0,
  }));

  // --- Activité créée sur les 8 dernières semaines ----------------------
  // `getWeekRange` repose uniquement sur l'arithmétique de `Date`
  // (getFullYear/getMonth/getDate), donc un changement de mois ou
  // d'année en cours de fenêtre est géré nativement, sans cas
  // particulier à coder.
  const weekBuckets: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = ACTIVITY_WINDOW_WEEKS - 1; i >= 0; i--) {
    const reference = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * i);
    const { start, end } = getWeekRange(reference);
    weekBuckets.push({
      key: getLocalDayKey(start),
      label: start.toLocaleDateString("fr-CA", { day: "numeric", month: "short" }),
      start,
      end,
    });
  }

  const weeklyActivity: TimeSeriesPoint[] = weekBuckets.map((bucket) => {
    let count = 0;
    for (const task of tasks) {
      if (!task.created_at) continue;
      const created = new Date(task.created_at);
      if (Number.isNaN(created.getTime())) continue;
      if (created >= bucket.start && created <= bucket.end) count += 1;
    }
    return { key: bucket.key, label: bucket.label, value: count };
  });

  // --- Réunions -----------------------------------------------------------
  const { start: weekStart, end: weekEnd } = getWeekRange(now);
  const meetingsThisWeek = meetings.filter((m) => {
    if (m.status !== "planned") return false;
    if (!m.starts_at) return false;
    const start = new Date(m.starts_at);
    if (Number.isNaN(start.getTime())) return false;
    return start >= weekStart && start <= weekEnd;
  }).length;

  const upcomingMeetingsCount = meetings.filter((m) => {
    if (m.status !== "planned") return false;
    if (!m.ends_at) return false;
    const end = new Date(m.ends_at);
    if (Number.isNaN(end.getTime())) return false;
    return end >= now;
  }).length;

  // --- Répartitions (donut + badges) --------------------------------------
  const tasksByStatus: ChartDatum[] = [
    { key: "todo", label: "À faire", value: tasksTodo.length, tone: "gray" },
    { key: "doing", label: "En cours", value: tasksInProgress.length, tone: "blue" },
    { key: "done", label: "Terminé", value: tasksDone.length, tone: "green" },
  ];

  const tasksByPriority: ChartDatum[] = [
    {
      key: "low",
      label: "Faible",
      value: tasks.filter((t) => t.priority === "low").length,
      tone: "gray",
    },
    {
      key: "medium",
      label: "Moyenne",
      value: tasks.filter((t) => t.priority === "medium").length,
      tone: "orange",
    },
    {
      key: "high",
      label: "Élevée",
      value: tasks.filter((t) => t.priority === "high").length,
      tone: "red",
    },
  ];

  const projectsByStatus: ChartDatum[] = [
    { key: "active", label: "Actif", value: activeProjects.length, tone: "blue" },
    { key: "completed", label: "Terminé", value: completedProjects.length, tone: "green" },
    { key: "archived", label: "Archivé", value: archivedProjects.length, tone: "gray" },
  ];

  // --- Progression par projet actif ---------------------------------------
  // Un projet sans tâche reste à 0 % (jamais NaN) — `ProjectProgressList`
  // affiche explicitement "Aucune tâche" dans ce cas.
  const projectProgress: ProjectProgressItem[] = activeProjects
    .map((project) => {
      const projectTasks = tasks.filter((t) => t.project_id === project.id);
      const done = projectTasks.filter((t) => cleanStatus(t.status) === "done").length;
      const total = projectTasks.length;
      return {
        projectId: project.id,
        title: project.title,
        totalTasks: total,
        doneTasks: done,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
      return a.title.localeCompare(b.title);
    });

  const taskCompletionRate =
    tasks.length > 0 ? Math.round((tasksDone.length / tasks.length) * 100) : 0;

  return {
    totals: {
      projects: projects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      archivedProjects: archivedProjects.length,
      tasks: tasks.length,
      tasksTodo: tasksTodo.length,
      tasksInProgress: tasksInProgress.length,
      tasksDone: tasksDone.length,
      overdueTasks,
      dueSoon7Days,
      meetings: meetings.length,
      meetingsThisWeek,
      upcomingMeetingsCount,
    },
    taskCompletionRate,
    tasksByStatus,
    tasksByPriority,
    projectsByStatus,
    upcomingWorkload,
    weeklyActivity,
    projectProgress,
  };
}

export interface GetDashboardAnalyticsResult {
  projects: Project[];
  tasks: TaskWithProject[];
  meetings: MeetingWithProject[];
  analytics: DashboardAnalytics;
  /** `true` si une ou deux des trois sources ont échoué (au moins une a
   *  réussi) — les données affichées sont partielles mais réelles. */
  hasPartialFailure: boolean;
  /** `true` si les trois sources ont échoué — `analytics` est alors
   *  calculé sur des tableaux vides et NE DOIT PAS être présenté comme
   *  "aucune donnée" : l'appelant doit afficher une vraie erreur. */
  hasCriticalFailure: boolean;
}

function logSourceFailure(source: string, reason: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[dashboard-analytics] échec du chargement (${source})`, reason);
  }
}

/**
 * Récupère les trois sources du Dashboard et calcule les métriques.
 *
 * Utilise `Promise.allSettled` (jamais `Promise.all`) : si une source
 * échoue, les autres sont quand même exploitées. `hasCriticalFailure`
 * distingue explicitement l'échec total (les trois sources en erreur)
 * d'un état "aucune donnée" légitime (utilisateur sans projet/tâche/
 * réunion), pour que la page affiche la bonne UI dans chaque cas.
 */
export async function getDashboardAnalytics(
  now: Date = new Date()
): Promise<GetDashboardAnalyticsResult> {
  const [projectsResult, tasksResult, meetingsResult] = await Promise.allSettled([
    getProjects({ orderByCreatedAtDesc: true }),
    getTasks(),
    getMeetings(),
  ]);

  let successCount = 0;

  let projects: Project[] = [];
  if (projectsResult.status === "fulfilled" && !projectsResult.value.error) {
    projects = projectsResult.value.data;
    successCount += 1;
  } else {
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
    successCount += 1;
  } else {
    logSourceFailure(
      "tâches",
      tasksResult.status === "rejected" ? tasksResult.reason : tasksResult.value.error
    );
  }

  let meetings: MeetingWithProject[] = [];
  if (meetingsResult.status === "fulfilled" && !meetingsResult.value.error) {
    meetings = meetingsResult.value.data;
    successCount += 1;
  } else {
    logSourceFailure(
      "réunions",
      meetingsResult.status === "rejected"
        ? meetingsResult.reason
        : meetingsResult.value.error
    );
  }

  return {
    projects,
    tasks,
    meetings,
    analytics: computeDashboardAnalytics(projects, tasks, meetings, now),
    hasPartialFailure: successCount > 0 && successCount < 3,
    hasCriticalFailure: successCount === 0,
  };
}
