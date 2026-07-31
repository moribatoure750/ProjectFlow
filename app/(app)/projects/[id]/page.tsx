"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ActivitySection } from "@/components/activity/ActivitySection";
import { AttachmentSection } from "@/components/attachments/AttachmentSection";
import { CommentsSection } from "@/components/comments/CommentsSection";

import { EntityDetailSkeleton } from "@/components/layout/EntityDetailSkeleton";
import { EntityHeader } from "@/components/layout/EntityHeader";
import { EntityLayout } from "@/components/layout/EntityLayout";
import { EntitySidebar } from "@/components/layout/EntitySidebar";
import { EntityTabs, type EntityTab } from "@/components/layout/EntityTabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Textarea } from "@/components/ui/Textarea";
import { ProjectSummaryButton } from "@/components/ai/ProjectSummaryButton";

import {
  CalendarIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderIcon,
  HistoryIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/ui/icons";


import { taskPriorityInfo, taskStatusInfo, meetingStatusInfo, projectStatusInfo } from "@/lib/badge-tones";
import { cleanStatus, formatDate } from "@/lib/format";
import { formatTimeRange } from "@/lib/meeting-grouping";
import { dangerGhostClasses } from "@/lib/utils";
import { getMeetings } from "@/services/meetings.service";

import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import type { MeetingWithProject } from "@/types/meeting";
import type { Project } from "@/types/project";
import type { TaskWithProject } from "@/types/task";


export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("info");

  const today = new Date().toISOString().split("T")[0];


  async function loadData() {
    setLoading(true);
    const [projectRes, tasksRes, meetingsRes] = await Promise.all([
      getProjectById(projectId),
      getTasks(),
      getMeetings(),
    ]);
    setLoading(false);

    if (projectRes.error) {
      alert(projectRes.error.message);
      return;
    }
    if (!projectRes.data) {
      setNotFound(true);
      return;
    }
    setProject(projectRes.data);

    if (!tasksRes.error) setTasks(tasksRes.data);
    if (!meetingsRes.error) setMeetings(meetingsRes.data);
  }

  useEffect(() => {
    function runInitialLoad() {
      loadData();
    }
    runInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId]
  );
  const projectMeetings = useMemo(
    () => meetings.filter((m) => m.project_id === projectId),
    [meetings, projectId]
  );

  const totalTasks = projectTasks.length;
  const doneTasks = projectTasks.filter(
    (t) => cleanStatus(t.status) === "done"
  ).length;
  const percent =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  function openEditModal() {
    if (!project) return;
    setTitle(project.title);
    setDescription(project.description ?? "");
    setDeadline(project.deadline);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function isFormValid() {
    if (!title.trim()) {
      alert("Le titre du projet est obligatoire.");
      return false;
    }
    if (!deadline) {
      alert("La date d'échéance est obligatoire.");
      return false;
    }
    return true;
  }

  async function handleUpdate() {
    if (!isFormValid()) return;

    setSubmitting(true);
    const { error } = await updateProject(projectId, {
      title,
      description,
      deadline,
    });
    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Projet mis à jour avec succès !");
    setModalOpen(false);
    loadData();
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteOpen(false);
  }

  async function confirmDelete() {
    setDeleteSubmitting(true);
    const { error } = await deleteProject(projectId);
    setDeleteSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Projet supprimé avec succès !");
    router.push("/projects");
  }

  if (loading) {
    return (
      <EntityLayout breadcrumbs={[{ label: "Projets", href: "/projects" }, { label: "Chargement…" }]}>
        <EntityDetailSkeleton
          extraMainCard={
            <Card className="space-y-3 p-5">
              <LoadingSkeleton className="h-4 w-24" />
              <LoadingSkeleton className="h-14 w-full" />
              <LoadingSkeleton className="h-14 w-full" />
            </Card>
          }
          sidebar={<LoadingSkeleton className="h-2 w-full rounded-full" />}
        />
      </EntityLayout>
    );
  }


  if (notFound || !project) {
    return (
      <EntityLayout breadcrumbs={[{ label: "Projets", href: "/projects" }, { label: "Introuvable" }]}>
        <EmptyState
          icon={<FolderIcon className="h-10 w-10" />}
          title="Projet introuvable"
          description="Ce projet n'existe pas ou ne vous appartient pas."
          action={
            <Button onClick={() => router.push("/projects")}>
              Retour aux projets
            </Button>
          }
        />
      </EntityLayout>
    );
  }

  const statusInfo = projectStatusInfo(project.status);

  const tabs: EntityTab[] = [
    { key: "info", label: "Informations" },
    { key: "tasks", label: `Tâches (${totalTasks})`, icon: CheckSquareIcon },
    { key: "meetings", label: `Réunions (${projectMeetings.length})`, icon: UsersIcon },
    { key: "attachments", label: "Pièces jointes", icon: PaperclipIcon },
    { key: "comments", label: "Commentaires", icon: MessageSquareIcon },
    { key: "history", label: "Activité", icon: HistoryIcon },
  ];

  return (

    <EntityLayout
      breadcrumbs={[{ label: "Projets", href: "/projects" }, { label: project.title }]}
    >
      <EntityHeader
        title={project.title}
        badge={<Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>}
        backHref="/projects"
        backLabel="Retour aux projets"
        actions={
          <>
            <ProjectSummaryButton projectId={projectId} />
            <Button
              variant="secondary"
              size="sm"
              icon={<PencilIcon className="h-3.5 w-3.5" />}
              onClick={openEditModal}
            >
              Modifier
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<TrashIcon className="h-3.5 w-3.5" />}
              onClick={() => setDeleteOpen(true)}
              className={dangerGhostClasses}
            >
              Supprimer
            </Button>
          </>
        }
      />

      <EntityTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {activeTab === "info" && (
            <Card className="p-5">
              <h2 className="mb-2 text-base font-semibold text-fg">Description</h2>
              <p className="whitespace-pre-wrap text-sm text-fg-muted">
                {project.description || "Aucune description."}
              </p>
            </Card>
          )}

          {activeTab === "tasks" && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-end">
                <Link
                  href="/tasks"
                  className="text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
                >
                  Voir toutes
                </Link>
              </div>

              {projectTasks.length === 0 ? (
                <EmptyState compact title="Aucune tâche pour ce projet" />
              ) : (
                <div className="space-y-2">
                  {projectTasks.map((task) => {
                    const taskStatus = taskStatusInfo(task.status);
                    const priorityInfo = taskPriorityInfo(task.priority);
                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">
                            {task.title}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(task.due_date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge tone={priorityInfo.tone}>{priorityInfo.label}</Badge>
                          <Badge tone={taskStatus.tone}>{taskStatus.label}</Badge>
                          <ChevronRightIcon className="h-4 w-4 text-fg-subtle" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {activeTab === "meetings" && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-end">
                <Link
                  href="/meetings"
                  className="text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
                >
                  Voir toutes
                </Link>
              </div>

              {projectMeetings.length === 0 ? (
                <EmptyState
                  compact
                  icon={<UsersIcon className="h-6 w-6" />}
                  title="Aucune réunion pour ce projet"
                />
              ) : (
                <div className="space-y-2">
                  {projectMeetings.map((meeting) => {
                    const meetingStatus = meetingStatusInfo(meeting.status);
                    return (
                      <Link
                        key={meeting.id}
                        href={`/meetings/${meeting.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">
                            {meeting.title}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
                            <ClockIcon className="h-3.5 w-3.5" />
                            {formatTimeRange(meeting.starts_at, meeting.ends_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge tone={meetingStatus.tone}>{meetingStatus.label}</Badge>
                          <ChevronRightIcon className="h-4 w-4 text-fg-subtle" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {activeTab === "attachments" && (
            <AttachmentSection entityType="project" entityId={projectId} />
          )}
          {activeTab === "comments" && (
            <CommentsSection entityType="project" entityId={projectId} />
          )}
          {activeTab === "history" && (
            <ActivitySection entityType="project" entityId={projectId} />
          )}
        </div>

        <div className="space-y-6">
          <EntitySidebar>
            <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-fg">
              <CalendarIcon className="h-4 w-4 text-fg-subtle" />
              Échéance : {formatDate(project.deadline)}
            </p>

            <div className="border-t border-border pt-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-fg-muted">
                <span>
                  {totalTasks} {totalTasks === 1 ? "tâche" : "tâches"} · {doneTasks}{" "}
                  terminée{doneTasks === 1 ? "" : "s"}
                </span>
                <span className="font-semibold text-fg">{percent}%</span>
              </div>
              <ProgressBar value={percent} label="Progression du projet" />
            </div>
          </EntitySidebar>
        </div>
      </div>


      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Modifier le projet"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} loading={submitting}>
              Mettre à jour
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">Titre</label>
            <Input
              placeholder="Titre du projet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Description
            </label>
            <Textarea
              placeholder="Description du projet"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Échéance
            </label>
            <Input
              type="date"
              min={today}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={closeDeleteModal}
        title="Supprimer le projet"
        variant="danger"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={deleteSubmitting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deleteSubmitting}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Voulez-vous vraiment supprimer le projet{" "}
          <span className="font-semibold text-fg">{project.title}</span> ? Cette
          action est irréversible.
        </p>
      </Modal>
    </EntityLayout>
  );
}
