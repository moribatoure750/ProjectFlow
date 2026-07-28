"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActivitySection } from "@/components/activity/ActivitySection";
import { AttachmentSection } from "@/components/attachments/AttachmentSection";
import { EntityComingSoon } from "@/components/layout/EntityComingSoon";
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
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CalendarIcon,
  CheckSquareIcon,
  FolderIcon,
  HistoryIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/ui/icons";


import { taskPriorityInfo, taskStatusInfo } from "@/lib/badge-tones";
import { formatDate } from "@/lib/format";
import { cn, dangerGhostClasses } from "@/lib/utils";
import { getProjects } from "@/services/projects.service";
import {
  deleteTask,
  getTaskById,
  updateTask,
  updateTaskStatus,
} from "@/services/tasks.service";
import type { Project } from "@/types/project";
import type { TaskPriority, TaskStatus, TaskWithProject } from "@/types/task";

const STATUS_OPTIONS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "À faire" },
  { key: "doing", label: "En cours" },
  { key: "done", label: "Terminé" },
];


export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;
  const router = useRouter();

  const [task, setTask] = useState<TaskWithProject | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("info");

  const today = new Date().toISOString().split("T")[0];


  async function loadData() {
    setLoading(true);
    const [taskRes, projectsRes] = await Promise.all([
      getTaskById(taskId),
      getProjects(),
    ]);
    setLoading(false);

    if (taskRes.error) {
      alert(taskRes.error.message);
      return;
    }
    if (!taskRes.data) {
      setNotFound(true);
      return;
    }
    setTask(taskRes.data);

    if (!projectsRes.error) setProjects(projectsRes.data);
  }

  useEffect(() => {
    function runInitialLoad() {
      loadData();
    }
    runInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function openEditModal() {
    if (!task) return;
    setProjectId(task.project_id);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date);
    setPriority(task.priority);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function isFormValid() {
    if (!projectId) {
      alert("Choisis un projet.");
      return false;
    }
    if (!title.trim()) {
      alert("Le titre de la tâche est obligatoire.");
      return false;
    }
    if (!dueDate) {
      alert("La date d'échéance est obligatoire.");
      return false;
    }
    return true;
  }

  async function handleUpdate() {
    if (!isFormValid()) return;

    setSubmitting(true);
    const { error } = await updateTask(taskId, {
      project_id: projectId,
      title,
      description,
      due_date: dueDate,
      priority,
    });
    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Tâche mise à jour avec succès !");
    setModalOpen(false);
    loadData();
  }

  async function handleChangeStatus(status: TaskStatus) {
    setStatusSubmitting(true);
    const { error } = await updateTaskStatus(taskId, status);
    setStatusSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }
    loadData();
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteOpen(false);
  }

  async function confirmDelete() {
    setDeleteSubmitting(true);
    const { error } = await deleteTask(taskId);
    setDeleteSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Tâche supprimée avec succès !");
    router.push("/tasks");
  }

  if (loading) {
    return (
      <EntityLayout breadcrumbs={[{ label: "Tâches", href: "/tasks" }, { label: "Chargement…" }]}>
        <EntityDetailSkeleton />

      </EntityLayout>
    );
  }

  if (notFound || !task) {
    return (
      <EntityLayout breadcrumbs={[{ label: "Tâches", href: "/tasks" }, { label: "Introuvable" }]}>
        <EmptyState
          icon={<CheckSquareIcon className="h-10 w-10" />}
          title="Tâche introuvable"
          description="Cette tâche n'existe pas ou ne vous appartient pas."
          action={
            <Button onClick={() => router.push("/tasks")}>
              Retour aux tâches
            </Button>
          }
        />
      </EntityLayout>
    );
  }

  const statusInfo = taskStatusInfo(task.status);
  const priorityInfo = taskPriorityInfo(task.priority);

  const tabs: EntityTab[] = [
    { key: "info", label: "Informations" },
    { key: "attachments", label: "Pièces jointes", icon: PaperclipIcon },
    { key: "comments", label: "Commentaires", icon: MessageSquareIcon },
    { key: "history", label: "Activité", icon: HistoryIcon },
  ];

  return (

    <EntityLayout
      breadcrumbs={[{ label: "Tâches", href: "/tasks" }, { label: task.title }]}
    >
      <EntityHeader
        title={task.title}
        badge={<Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>}
        backHref="/tasks"
        backLabel="Retour aux tâches"
        actions={
          <>
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
            <>
              <Card className="p-5">
                <h2 className="mb-2 text-base font-semibold text-fg">Description</h2>
                <p className="whitespace-pre-wrap text-sm text-fg-muted">
                  {task.description || "Aucune description."}
                </p>
              </Card>

              <Card className="mt-6 p-5">
                <h2 className="mb-3 text-base font-semibold text-fg">
                  Changer le statut
                </h2>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isCurrent = option.key === task.status;
                    return (
                      <Button
                        key={option.key}
                        variant={isCurrent ? "primary" : "secondary"}
                        size="sm"
                        disabled={isCurrent || statusSubmitting}
                        onClick={() => handleChangeStatus(option.key)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

          {activeTab === "attachments" && (
            <AttachmentSection entityType="task" entityId={taskId} />
          )}
          {activeTab === "comments" && (
            <EntityComingSoon
              icon={<MessageSquareIcon className="h-6 w-6" />}
              title="Commentaires"
            />
          )}
          {activeTab === "history" && (
            <ActivitySection entityType="task" entityId={taskId} />
          )}
        </div>

        <div className="space-y-6">
          <EntitySidebar>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Projet
                </p>
                {task.projects?.title ? (
                  <Link
                    href={`/projects/${task.project_id}`}
                    className="inline-flex items-center gap-1.5 font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
                  >
                    <FolderIcon className="h-4 w-4" />
                    {task.projects.title}
                  </Link>
                ) : (
                  <span className="text-fg-muted">Sans projet</span>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Échéance
                </p>
                <p className={cn("flex items-center gap-1.5 font-medium text-fg")}>
                  <CalendarIcon className="h-4 w-4 text-fg-subtle" />
                  {formatDate(task.due_date)}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Priorité
                </p>
                <Badge tone={priorityInfo.tone}>{priorityInfo.label}</Badge>
              </div>
            </div>
          </EntitySidebar>
        </div>
      </div>


      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Modifier la tâche"
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
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Projet associé
            </label>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={submitting}
            >
              <option value="">Choisir un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Titre de la tâche
            </label>
            <Input
              placeholder="Exemple : Rédiger le rapport"
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
              placeholder="Décrire brièvement la tâche à réaliser"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
                Date d&apos;échéance
              </label>
              <Input
                type="date"
                min={today}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
                Priorité
              </label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={submitting}
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={closeDeleteModal}
        title="Supprimer la tâche"
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
          Voulez-vous vraiment supprimer la tâche{" "}
          <span className="font-semibold text-fg">{task.title}</span> ? Cette
          action est irréversible.
        </p>
      </Modal>
    </EntityLayout>
  );
}
