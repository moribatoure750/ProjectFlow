"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { taskPriorityInfo, taskStatusInfo } from "@/lib/badge-tones";
import { getProjects } from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import type { Project } from "@/types/project";
import type { TaskWithProject } from "@/types/task";

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Chargement...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Bonjour 👋"
        description="Voici un aperçu de vos projets académiques"
      />

      {!hasAnyData ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="Bienvenue sur votre espace de gestion"
          description="Créez votre premier projet pour commencer à organiser vos tâches académiques."
          action={
            <Link
              href="/projects"
              className="text-sm font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
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
            <StatCard
              icon={<TargetIcon className="h-5 w-5" />}
              label="Taux de complétion"
              value={`${completionRate}%`}
            />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">
                  Projets récents
                </h2>
                <Link
                  href="/projects"
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
                >
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
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {project.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {formatDate(project.deadline)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">
                  Tâches à échéance proche
                </h2>
                <Link
                  href="/tasks"
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
                >
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
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">
                            {task.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(task.due_date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
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
