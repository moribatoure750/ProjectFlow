import type { BadgeTone } from "@/components/ui/Badge";

/**
 * Types du Dashboard analytique (Lot 11) — aucune persistance, tout est
 * dérivé à la volée de `projects`/`tasks`/`meetings.service.ts` par
 * `services/dashboard-analytics.service.ts`.
 *
 * Contrainte assumée : le schéma n'a pas de `completed_at` sur les
 * tâches — impossible de reconstituer un historique réel de
 * complétion. Toutes les métriques ci-dessous restent calculables à
 * partir des colonnes réellement disponibles (`created_at`, `due_date`,
 * `starts_at`/`ends_at`, `status`, `priority`).
 */

/** Point de répartition catégorielle (donut / badges), coloré via un
 *  `BadgeTone` existant — jamais une couleur codée en dur. */
export interface ChartDatum {
  key: string;
  label: string;
  value: number;
  tone: BadgeTone;
}

/** Point de série temporelle (bar chart) — pas de tonalité, une seule
 *  série par graphique dans ce lot. */
export interface TimeSeriesPoint {
  key: string;
  label: string;
  value: number;
}

/** Progression d'un projet actif (tâches terminées / total). */
export interface ProjectProgressItem {
  projectId: string;
  title: string;
  totalTasks: number;
  doneTasks: number;
  /** 0-100, toujours 0 si `totalTasks === 0` (jamais `NaN`). */
  completionRate: number;
}

export interface DashboardTotals {
  projects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects: number;

  tasks: number;
  tasksTodo: number;
  tasksInProgress: number;
  tasksDone: number;
  /** Tâches non terminées dont `due_date` est déjà passée. */
  overdueTasks: number;
  /** Tâches non terminées dont `due_date` tombe dans les 7 prochains
   *  jours (aujourd'hui inclus) — total, indépendant du détail par jour
   *  exposé par `upcomingWorkload`. */
  dueSoon7Days: number;

  meetings: number;
  /** Réunions planifiées dont `starts_at` tombe dans la semaine locale
   *  courante (lundi → dimanche). */
  meetingsThisWeek: number;
  /** Réunions planifiées pas encore terminées (`ends_at` >= maintenant). */
  upcomingMeetingsCount: number;
}

export interface DashboardAnalytics {
  totals: DashboardTotals;
  /** 0-100, 0 si aucune tâche. */
  taskCompletionRate: number;

  tasksByStatus: ChartDatum[]; // todo / doing / done — donut
  tasksByPriority: ChartDatum[]; // low / medium / high — badges
  projectsByStatus: ChartDatum[]; // active / completed / archived — badges

  /** 7 prochains jours (aujourd'hui inclus), un point par jour, jours
   *  sans échéance inclus à 0 — bar chart. */
  upcomingWorkload: TimeSeriesPoint[];
  /** 8 dernières semaines (tâches créées), la plus ancienne en premier
   *  — bar chart. */
  weeklyActivity: TimeSeriesPoint[];

  /** Projets actifs uniquement, triés par progression décroissante puis
   *  par titre — non tronqué : la limite d'affichage (5) est une
   *  décision de présentation laissée à `ProjectProgressList`. */
  projectProgress: ProjectProgressItem[];
}
