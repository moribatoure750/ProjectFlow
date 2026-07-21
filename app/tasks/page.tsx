"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import {
  CalendarIcon,
  CheckSquareIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import { taskPriorityInfo, taskStatusInfo } from "@/lib/badge-tones";
import { getProjects } from "@/services/projects.service";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTaskStatus,
} from "@/services/tasks.service";
import type { Project } from "@/types/project";
import type { TaskPriority, TaskStatus, TaskWithProject } from "@/types/task";

type ProjectFilter = "all" | string;
type PriorityFilter = "all" | TaskPriority;

function SkeletonTaskCard() {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <LoadingSkeleton className="h-4 w-2/3" />
        <LoadingSkeleton className="h-4 w-4 rounded" />
      </div>
      <div className="flex gap-1.5">
        <LoadingSkeleton className="h-5 w-16 rounded-full" />
        <LoadingSkeleton className="h-5 w-20 rounded-full" />
      </div>
      <LoadingSkeleton className="h-3 w-24" />
    </Card>
  );
}

function SkeletonColumn() {
  return (
    <div className="min-w-[280px] shrink-0 lg:w-auto">
      <div className="mb-3 flex items-center gap-2">
        <LoadingSkeleton className="h-5 w-20" />
        <LoadingSkeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        <SkeletonTaskCard />
        <SkeletonTaskCard />
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<TaskWithProject | null>(
    null
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const today = new Date().toISOString().split("T")[0];

  const columns: { key: TaskStatus; label: string; empty: string }[] = [
    { key: "todo", label: "À faire", empty: "Aucune tâche à faire" },
    { key: "doing", label: "En cours", empty: "Aucune tâche en cours" },
    { key: "done", label: "Terminé", empty: "Aucune tâche terminée" },
  ];

  function cleanStatus(status: string) {
    return status?.trim().toLowerCase();
  }

  async function loadProjects() {
    const { data, error } = await getProjects();
    if (error) {
      alert(error.message);
      return;
    }
    setProjects(data);
  }

  async function loadTasks() {
    setLoading(true);
    const { data, error } = await getTasks();
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }
    setTasks(data);
  }

  useEffect(() => {
    loadProjects();
    loadTasks();
  }, []);

  useEffect(() => {
    if (!openMenuId) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openMenuId]);

  function resetForm() {
    setProjectId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    resetForm();
  }

  function resetFilters() {
    setSearch("");
    setProjectFilter("all");
    setPriorityFilter("all");
  }

  async function addTask() {
    if (!projectId) return alert("Choisis un projet.");
    if (!title.trim()) return alert("Le titre de la tâche est obligatoire.");
    if (!dueDate) return alert("La date d’échéance est obligatoire.");
    if (dueDate < today) {
      return alert("La date d’échéance ne peut pas être antérieure à aujourd’hui.");
    }

    setSubmitting(true);
    const { error } = await createTask({
      project_id: projectId,
      title,
      description,
      due_date: dueDate,
      priority,
      status: "todo",
    });
    setSubmitting(false);

    if (error) return alert(error.message);

    alert("Tâche créée avec succès !");
    closeModal();
    loadTasks();
  }

  async function changeStatus(id: string, newStatus: TaskStatus) {
    setOpenMenuId(null);
    setStatusUpdatingId(id);
    const { error } = await updateTaskStatus(id, newStatus);
    setStatusUpdatingId(null);

    if (error) return alert(error.message);
    loadTasks();
  }

  function openDeleteModal(task: TaskWithProject) {
    setOpenMenuId(null);
    setDeleteTarget(task);
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);
    const { error } = await deleteTask(deleteTarget.id);
    setDeleteSubmitting(false);

    if (error) return alert(error.message);

    alert("Tâche supprimée !");
    setDeleteTarget(null);
    loadTasks();
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesProject =
        projectFilter === "all" || task.project_id === projectFilter;
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesProject && matchesPriority;
    });
  }, [tasks, search, projectFilter, priorityFilter]);

  return (
    <div>
      <PageHeader
        title="Tâches"
        description="Suivez la progression de vos tâches par statut"
        actions={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreateModal}>
            Nouvelle tâche

          </Button>
        }
      />

      {!loading && tasks.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            icon={<SearchIcon className="h-4 w-4" />}
            placeholder="Rechercher une tâche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="sm:w-48"
          >
            <option value="all">Tous les projets</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as PriorityFilter)
            }
            className="sm:w-44"
          >
            <option value="all">Toutes les priorités</option>
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Élevée</option>
          </Select>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <p className="mb-3 text-xs text-fg-subtle lg:hidden">
          ← Faites glisser pour voir les autres colonnes →
        </p>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
          <SkeletonColumn />
          <SkeletonColumn />
          <SkeletonColumn />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquareIcon className="h-10 w-10" />}
          title="Aucune tâche pour le moment"
          description="Créez votre première tâche pour commencer."
          action={
            <Button
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={openCreateModal}
            >
              Créer une tâche
            </Button>
          }
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-10 w-10" />}
          title="Aucun résultat"
          description="Essayez de modifier vos filtres de recherche."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(
              (task) => cleanStatus(task.status) === column.key
            );
            const columnStatusInfo = taskStatusInfo(column.key);

            return (
              <div key={column.key} className="min-w-[280px] shrink-0 lg:w-auto">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="font-semibold text-fg">{column.label}</h2>
                  <Badge tone={columnStatusInfo.tone}>
                    {columnTasks.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<CheckSquareIcon className="h-6 w-6" />}
                      title={column.empty}
                    />
                  ) : (
                    columnTasks.map((task) => {
                      const priorityInfo = taskPriorityInfo(task.priority);
                      const menuOpen = openMenuId === task.id;
                      const isUpdating = statusUpdatingId === task.id;

                      return (
                        <Card
                          key={task.id}
                          hoverable
                          className={
                            "relative p-4" + (isUpdating ? " opacity-60" : "")
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-fg">
                              {task.title}
                            </h3>
                            <button
                              onClick={() =>
                                setOpenMenuId(menuOpen ? null : task.id)
                              }
                              disabled={isUpdating}
                              aria-label="Actions"
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              className="rounded-md p-1 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <Spinner size="sm" />
                              ) : (
                                <MoreVerticalIcon className="h-4 w-4" />
                              )}
                            </button>

                            {menuOpen && (
                              <div
                                role="menu"
                                className="absolute right-3 top-9 z-10 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg"
                              >
                                {columns
                                  .filter((c) => c.key !== column.key)
                                  .map((c) => (
                                    <button
                                      key={c.key}
                                      role="menuitem"
                                      onClick={() =>
                                        changeStatus(task.id, c.key)
                                      }
                                      className="block w-full px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
                                    >
                                      Déplacer vers « {c.label} »
                                    </button>
                                  ))}
                                <div className="my-1 border-t border-border" />
                                <button
                                  role="menuitem"
                                  onClick={() => openDeleteModal(task)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-100/10"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>

                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 flex items-center gap-1.5">
                            <Badge tone={priorityInfo.tone}>
                              {priorityInfo.label}
                            </Badge>
                            {task.projects?.title && (
                              <Badge tone="purple">{task.projects.title}</Badge>
                            )}
                          </div>

                          <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {formatDate(task.due_date)}
                          </p>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Nouvelle tâche"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button onClick={addTask} loading={submitting}>
              Créer la tâche
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
                Date d’échéance
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
        open={deleteTarget !== null}
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
          <span className="font-semibold text-fg">{deleteTarget?.title}</span>{" "}
          ? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  );
}
