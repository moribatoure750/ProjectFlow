"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { ProjectProgressList } from "@/components/dashboard/ProjectProgressList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SkeletonListItem,
  SkeletonStatCard,
} from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Toast } from "@/components/ui/Toast";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderIcon,
  InboxIcon,
  MapPinIcon,
  RefreshIcon,
  TargetIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import {
  projectStatusInfo,
  taskPriorityInfo,
  taskStatusInfo,
} from "@/lib/badge-tones";
import { BRAND } from "@/lib/brand";
import {
  formatTimeRange,
  isMeetingInProgress,
  isStartingSoon,
} from "@/lib/meeting-grouping";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";


const sectionLinkClasses =
  "flex items-center gap-1 rounded-md text-sm font-medium text-fg-muted transition-colors duration-150 ease-out hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Fade-in with a small staggered delay, used for lists/grids of cards. */
function fadeInStyle(index: number) {
  return { animationDelay: `${index * 60}ms` };
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

/**
 * DashboardStatCard — premium metric card for the dashboard only.
 * Kept local to this file (not the shared `StatCard`) so that `/projects`
 * and `/tasks` are not affected by this visual pass.
 */
function DashboardStatCard({
  icon,
  label,
  value,
  hint,
  index = 0,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: ReactNode;
  index?: number;
}) {
  return (
    <Card
      hoverable
      className="animate-fade-in flex items-center gap-4 p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5"
      style={fadeInStyle(index)}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {label}
        </p>
        <p className="mt-0.5 text-3xl font-bold leading-none tracking-tight text-fg">
          {value}
        </p>
        {hint && <div className="mt-1.5">{hint}</div>}
      </div>
    </Card>
  );
}

export default function Home() {
  const {
    projects,
    tasks,
    meetings,
    analytics,
    loading,
    refreshing,
    hasPartialFailure,
    hasCriticalFailure,
    refetch,
  } = useDashboardAnalytics();

  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);

  const upcomingTasks = tasks
    .filter((t) => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due >= today && due <= in7Days;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const recentProjects = projects.slice(0, 5);
  const nearestTasks = [...tasks]
    .filter((t) => t.status?.trim().toLowerCase() !== "done")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 5);

  /** Prochaines réunions planifiées : futures OU en cours (pas encore
   * terminées), triées chronologiquement, limitées à 3. */
  const upcomingMeetings = meetings
    .filter((m) => m.status === "planned" && new Date(m.ends_at) >= today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 3);

  const hasAnyData =
    projects.length > 0 || tasks.length > 0 || meetings.length > 0;

  const refreshAction = (
    <Button
      variant="secondary"
      size="sm"
      icon={<RefreshIcon className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />}
      onClick={() => refetch()}
      disabled={loading || refreshing}
      aria-busy={refreshing || undefined}
    >
      Actualiser
    </Button>
  );

  // --- Échec critique : les trois sources ont échoué -----------------------
  // Ne doit jamais être confondu avec "aucune donnée" (état légitime) :
  // on affiche une vraie erreur, pas l'écran de bienvenue.
  if (!loading && hasCriticalFailure) {
    return (
      <div>
        <PageHeader
          title="Bonjour 👋"
          description={`Voici un aperçu de vos projets et tâches sur ${BRAND.name}.`}
          actions={refreshAction}
        />
        <EmptyState
          icon={<AlertTriangleIcon className="h-10 w-10 text-danger-600" />}
          title="Impossible de charger le tableau de bord"
          description="Une erreur est survenue lors du chargement de vos données. Vérifiez votre connexion et réessayez."
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          }
        />
      </div>
    );
  }

  const summaryItems = analytics
    ? [
        `${analytics.totals.activeProjects} ${pluralize(analytics.totals.activeProjects, "projet actif", "projets actifs")}`,
        `${analytics.totals.tasksInProgress} ${pluralize(analytics.totals.tasksInProgress, "tâche en cours", "tâches en cours")}`,
        upcomingTasks.length === 0
          ? "aucune échéance cette semaine"
          : `${upcomingTasks.length} ${pluralize(upcomingTasks.length, "échéance", "échéances")} cette semaine`,
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Bonjour 👋"
        description={`Voici un aperçu de vos projets et tâches sur ${BRAND.name}.`}
        actions={!loading ? refreshAction : undefined}
      />

      {hasPartialFailure && !loading && (
        <div className="mb-6">
          <Toast variant="warning">
            Certaines données n&apos;ont pas pu être chargées. Les chiffres
            affichés peuvent être incomplets.
          </Toast>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-3 h-4 w-40 animate-pulse rounded bg-surface-hover" />
            <div className="space-y-2">
              <div className="h-3 w-56 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-48 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-40 animate-pulse rounded bg-surface-hover" />
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <div className="mb-4 h-5 w-32 animate-pulse rounded bg-surface-hover" />
              <div className="h-24 animate-pulse rounded bg-surface-hover" />
            </Card>
            <Card className="p-5">
              <div className="mb-4 h-5 w-32 animate-pulse rounded bg-surface-hover" />
              <div className="h-24 animate-pulse rounded bg-surface-hover" />
            </Card>
            <Card className="p-5">
              <div className="mb-4 h-5 w-32 animate-pulse rounded bg-surface-hover" />
              <div className="h-24 animate-pulse rounded bg-surface-hover" />
            </Card>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 h-5 w-32 animate-pulse rounded bg-surface-hover" />
              <div className="space-y-3">
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-4 h-5 w-48 animate-pulse rounded bg-surface-hover" />
              <div className="space-y-3">
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
              </div>
            </Card>
          </div>
          <Card className="p-5">
            <div className="mb-4 h-5 w-44 animate-pulse rounded bg-surface-hover" />
            <div className="space-y-3">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          </Card>
        </div>

      ) : !hasAnyData ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="Bienvenue sur votre espace de gestion"
          description={`Créez votre premier projet pour commencer à organiser vos tâches académiques sur ${BRAND.name}.`}
          action={
            <Link
              href="/projects"
              className="rounded-md text-sm font-medium text-accent underline underline-offset-2 transition-colors duration-150 ease-out hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Créer votre premier projet
            </Link>
          }
        />
      ) : analytics ? (
        <>
          {/* Résumé intelligent */}
          <Card className="animate-fade-in mb-6 flex items-start gap-3 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
              <TargetIcon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-fg">Vous avez actuellement :</p>
              <ul className="mt-2 space-y-1.5">
                {summaryItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-fg-muted"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <DashboardStatCard
              index={0}
              icon={<FolderIcon className="h-6 w-6" />}
              label="Projets actifs"
              value={analytics.totals.activeProjects}
            />
            <DashboardStatCard
              index={1}
              icon={<CheckSquareIcon className="h-6 w-6" />}
              label="Tâches en cours"
              value={analytics.totals.tasksInProgress}
            />
            <DashboardStatCard
              index={2}
              icon={<ClockIcon className="h-6 w-6" />}
              label="Échéances (7 jours)"
              value={analytics.totals.dueSoon7Days}
              hint={
                analytics.totals.overdueTasks > 0 ? (
                  <span className="text-xs font-medium text-danger-600">
                    {analytics.totals.overdueTasks}{" "}
                    {pluralize(analytics.totals.overdueTasks, "tâche en retard", "tâches en retard")}
                  </span>
                ) : undefined
              }
            />
            <DashboardStatCard
              index={3}
              icon={<UsersIcon className="h-6 w-6" />}
              label="Réunions cette semaine"
              value={analytics.totals.meetingsThisWeek}
            />
            <DashboardStatCard
              index={4}
              icon={<TargetIcon className="h-6 w-6" />}
              label="Taux de complétion"
              value={`${analytics.taskCompletionRate}%`}
              hint={
                <div className="space-y-1">
                  <ProgressBar
                    value={analytics.taskCompletionRate}
                    label="Taux de complétion"
                  />
                  <p className="text-xs text-fg-subtle">
                    {analytics.totals.tasksDone}/{analytics.totals.tasks}{" "}
                    {pluralize(analytics.totals.tasks, "tâche terminée", "tâches terminées")}
                  </p>
                </div>
              }
            />
          </div>

          {/* Analyses — 3 visualisations maximum */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="animate-fade-in p-5" style={fadeInStyle(5)}>
              <h2 className="mb-4 text-base font-semibold text-fg">
                Tâches par statut
              </h2>
              <DonutChart
                data={analytics.tasksByStatus}
                ariaLabel="Répartition des tâches par statut"
                centerLabel={String(analytics.totals.tasks)}
              />
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                {analytics.tasksByPriority.map((d) => (
                  <Badge key={d.key} tone={d.tone}>
                    {d.label} · {d.value}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="animate-fade-in p-5" style={fadeInStyle(6)}>
              <h2 className="mb-4 text-base font-semibold text-fg">
                Charge à venir (7 jours)
              </h2>
              <BarChart
                data={analytics.upcomingWorkload}
                ariaLabel="Nombre de tâches à échéance par jour, sur les 7 prochains jours"
                emptyMessage="Aucune échéance dans les 7 prochains jours."
              />
            </Card>

            <Card className="animate-fade-in p-5" style={fadeInStyle(7)}>
              <h2 className="mb-4 text-base font-semibold text-fg">
                Activité (8 semaines)
              </h2>
              <BarChart
                data={analytics.weeklyActivity}
                ariaLabel="Nombre de tâches créées par semaine, sur les 8 dernières semaines"
                emptyMessage="Aucune tâche créée sur cette période."
              />
            </Card>
          </div>

          {/* Progression des projets actifs */}
          <Card className="animate-fade-in mt-6 p-5" style={fadeInStyle(8)}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-fg">
                Progression des projets actifs
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {analytics.projectsByStatus.map((d) => (
                  <Badge key={d.key} tone={d.tone}>
                    {d.label} · {d.value}
                  </Badge>
                ))}
              </div>
            </div>

            {analytics.projectProgress.length === 0 ? (
              <EmptyState
                compact
                title="Aucun projet actif"
                description="La progression de vos projets actifs apparaîtra ici."
              />
            ) : (
              <ProjectProgressList items={analytics.projectProgress} />
            )}
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="animate-fade-in p-5" style={fadeInStyle(9)}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-fg">
                  Projets récents
                </h2>
                <Link href="/projects" className={sectionLinkClasses}>
                  Voir tous les projets
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <EmptyState
                  compact
                  title="Aucun projet"
                  description="Créez votre premier projet."
                />
              ) : (
                <div className="space-y-2.5">
                  {recentProjects.map((project, i) => {
                    const statusInfo = projectStatusInfo(project.status);
                    return (
                      <div
                        key={project.id}
                        className="animate-fade-in flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3.5 transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
                        style={fadeInStyle(i + 10)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-fg">
                            {project.title}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(project.deadline)}
                          </p>
                        </div>
                        <Badge
                          tone={statusInfo.tone}
                          className="shrink-0 self-center"
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="animate-fade-in p-5" style={fadeInStyle(11)}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-fg">
                  Tâches à échéance proche
                </h2>
                <Link href="/tasks" className={sectionLinkClasses}>
                  Voir toutes les tâches
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>

              {nearestTasks.length === 0 ? (
                <EmptyState
                  compact
                  title="Aucune tâche à venir"
                  description="Vos tâches en cours apparaîtront ici."
                />
              ) : (
                <div className="space-y-2.5">
                  {nearestTasks.map((task, i) => {
                    const statusInfo = taskStatusInfo(task.status);
                    const priorityInfo = taskPriorityInfo(task.priority);
                    return (
                      <div
                        key={task.id}
                        className="animate-fade-in flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3.5 transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
                        style={fadeInStyle(i + 12)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-fg">
                            {task.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-fg-subtle">
                            {task.projects?.title ?? "Sans projet"}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(task.due_date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 self-center">
                          <Badge tone={priorityInfo.tone}>
                            {priorityInfo.label}
                          </Badge>
                          <Badge tone={statusInfo.tone}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <Card className="animate-fade-in mt-6 p-5" style={fadeInStyle(13)}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">
                Prochaines réunions
              </h2>
              <Link href="/meetings" className={sectionLinkClasses}>
                Voir toutes les réunions
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>

            {upcomingMeetings.length === 0 ? (
              <EmptyState
                compact
                icon={<UsersIcon className="h-8 w-8" />}
                title="Aucune réunion à venir"
                description="Vos prochaines réunions planifiées apparaîtront ici."
              />
            ) : (
              <div className="space-y-2.5">
                {upcomingMeetings.map((meeting, i) => {
                  const inProgress = isMeetingInProgress(meeting, today);
                  const soon = !inProgress && isStartingSoon(meeting.starts_at, today);


                  return (
                    <div
                      key={meeting.id}
                      className="animate-fade-in flex flex-col gap-3 rounded-lg border border-border px-4 py-3.5 transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between"
                      style={fadeInStyle(i + 14)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-fg">
                            {meeting.title}
                          </p>
                          {inProgress && <Badge tone="blue">En cours</Badge>}
                          {soon && <Badge tone="orange">Commence bientôt</Badge>}
                        </div>
                        <p className="mt-1 truncate text-xs text-fg-subtle">
                          {meeting.projects?.title ?? "Sans projet"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
                          <span className="flex items-center gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(meeting.starts_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <ClockIcon className="h-3.5 w-3.5" />
                            {formatTimeRange(meeting.starts_at, meeting.ends_at)}
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPinIcon className="h-3.5 w-3.5" />
                              {meeting.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {meeting.meeting_url && (
                        <a
                          href={meeting.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1.5 self-start rounded-md text-sm font-medium text-info-600 transition-colors duration-150 hover:text-info-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-center"
                        >
                          <VideoIcon className="h-4 w-4" />
                          Rejoindre
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
