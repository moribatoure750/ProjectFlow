"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SkeletonListItem,
  SkeletonStatCard,
} from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import {
  CalendarIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderIcon,
  InboxIcon,
  TargetIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import {
  projectStatusInfo,
  taskPriorityInfo,
  taskStatusInfo,
} from "@/lib/badge-tones";
import { BRAND } from "@/lib/brand";
import { getProjects } from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import type { Project } from "@/types/project";
import type { TaskWithProject } from "@/types/task";

const sectionLinkClasses =
  "flex items-center gap-1 rounded-md text-sm font-medium text-fg-muted transition-colors duration-150 ease-out hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [projectsRes, tasksRes] = await Promise.all([
        getProjects({ orderByCreatedAtDesc: true }),
        getTasks(),
      ]);

      if (!projectsRes.error) setProjects(projectsRes.data);
      if (!tasksRes.error) setTasks(tasksRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active");
  const tasksInProgress = tasks.filter(
    (t) => t.status?.trim().toLowerCase() === "doing"
  );
  const doneTasks = tasks.filter(
    (t) => t.status?.trim().toLowerCase() === "done"
  );

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

  const completionRate =
    tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const recentProjects = projects.slice(0, 5);
  const nearestTasks = [...tasks]
    .filter((t) => t.status?.trim().toLowerCase() !== "done")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 5);

  const hasAnyData = projects.length > 0 || tasks.length > 0;

  return (
    <div>
      <PageHeader
        title="Bonjour 👋"
        description={`Voici un aperçu de vos projets et tâches sur ${BRAND.name}.`}
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
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
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<FolderIcon className="h-5 w-5" />}
              label="Projets actifs"
              value={activeProjects.length}
            />
            <StatCard
              icon={<CheckSquareIcon className="h-5 w-5" />}
              label="Tâches en cours"
              value={tasksInProgress.length}
            />
            <StatCard
              icon={<ClockIcon className="h-5 w-5" />}
              label="Échéances (7 jours)"
              value={upcomingTasks.length}
            />
            <div className="flex flex-col gap-2">
              <StatCard
                icon={<TargetIcon className="h-5 w-5" />}
                label="Taux de complétion"
                value={`${completionRate}%`}
              />
              <ProgressBar
                value={completionRate}
                label="Taux de complétion"
                className="px-1"
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-fg">Projets récents</h2>
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
                <div className="space-y-3">
                  {recentProjects.map((project) => {
                    const statusInfo = projectStatusInfo(project.status);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">
                            {project.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-subtle">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(project.deadline)}
                          </p>
                        </div>
                        <Badge tone={statusInfo.tone} className="shrink-0">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-fg">
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
                <div className="space-y-3">
                  {nearestTasks.map((task) => {
                    const statusInfo = taskStatusInfo(task.status);
                    const priorityInfo = taskPriorityInfo(task.priority);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">
                            {task.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-fg-subtle">
                            {task.projects?.title ?? "Sans projet"}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-subtle">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(task.due_date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
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
        </>
      )}
    </div>
  );
}
