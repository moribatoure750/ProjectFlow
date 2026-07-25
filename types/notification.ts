/**
 * Notification calculée (Lot 10A) — jamais persistée, jamais issue
 * d'une table `notifications` : entièrement dérivée à la volée des
 * données déjà exposées par `projects`/`tasks`/`meetings.service.ts`
 * (voir `services/notifications.service.ts`).
 *
 * Volontairement minimal : aucun champ `title` séparé — le libellé
 * générique de la catégorie ("Tâche en retard", etc.) est dérivé via
 * `lib/notification-meta.ts` (`notificationCategoryInfo()`), pour
 * éviter toute duplication entre les deux.
 */
export type NotificationCategory =
  | "task_overdue" // 🔴 tâche non terminée, due_date < aujourd'hui
  | "task_due_today" // 🟠 tâche non terminée, due_date = aujourd'hui
  | "meeting_today" // 🔵 réunion planifiée, starts_at = aujourd'hui
  | "project_deadline" // 🟣 projet actif, deadline dans 0 à N jours
  | "task_due_soon"; // 🟡 tâche non terminée, due_date dans 1 à N jours

export interface AppNotification {
  /** Identifiant déterministe `${category}-${entityId}` — une seule
   *  notification par entité (aucun chevauchement de catégories, voir
   *  `computeNotifications()`). */
  id: string;
  category: NotificationCategory;
  /** Détail spécifique à l'entité, ex. "Rapport final — Projet X". */
  message: string;
  /** Date ISO utilisée pour le tri et l'affichage (due_date / starts_at
   *  / deadline selon la catégorie). */
  date: string;
  /** Cible générique de navigation : /tasks, /meetings ou /projects. */
  href: string;
}
