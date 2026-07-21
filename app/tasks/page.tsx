"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CalendarIcon,
  CheckSquareIcon,
  MoreVerticalIcon,
  PlusIcon,
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

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    setModalOpen(false);
    resetForm();
  }

  async function addTask() {
    if (!projectId) return alert("Choisis un projet.");
    if (!title.trim()) return alert("Le titre de la tâche est obligatoire.");
    if (!dueDate) return alert("La date d’échéance est obligatoire.");
    if (dueDate < today) {
      return alert("La date d’échéance ne peut pas être antérieure à aujourd’hui.");
    }

    const { error } = await createTask({
      project_id: projectId,
      title,
      description,
      due_date: dueDate,
      priority,
      status: "todo",
    });

    if (error) return alert(error.message);

    alert("Tâche créée avec succès !");
    closeModal();
    loadTasks();
  }

  async function changeStatus(id: string, newStatus: TaskStatus) {
    setOpenMenuId(null);
    const { error } = await updateTaskStatus(id, newStatus);

    if (error) return alert(error.message);
    loadTasks();
  }

  async function deleteTaskHandler(id: string) {
    setOpenMenuId(null);
    if (!confirm("Voulez-vous supprimer cette tâche ?")) return;

    const { error } = await deleteTask(id);
    if (error) return alert(error.message);

    alert("Tâche supprimée !");
    loadTasks();
  }

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

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          Chargement...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {columns.map((column) => {
            const columnTasks = tasks.filter(
              (task) => cleanStatus(task.status) === column.key
            );

            return (
              <div key={column.key} className="w-72 shrink-0 lg:w-auto">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900">
                    {column.label}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {columnTasks.length}
                  </span>
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

                      return (
                        <Card key={task.id} className="relative p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-slate-900">
                              {task.title}
                            </h3>
                            <button
                              onClick={() =>
                                setOpenMenuId(menuOpen ? null : task.id)
                              }
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Actions"
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </button>

                            {menuOpen && (
                              <div className="absolute right-3 top-9 z-10 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                {columns
                                  .filter((c) => c.key !== column.key)
                                  .map((c) => (
                                    <button
                                      key={c.key}
                                      onClick={() =>
                                        changeStatus(task.id, c.key)
                                      }
                                      className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                                    >
                                      Déplacer vers « {c.label} »
                                    </button>
                                  ))}
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  onClick={() => deleteTaskHandler(task.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>

                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
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

                          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
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
            <Button variant="secondary" onClick={closeModal}>
              Annuler
            </Button>
            <Button onClick={addTask}>Créer la tâche</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Projet associé
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Choisir un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Titre de la tâche
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              placeholder="Exemple : Rédiger le rapport"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              className="w-full min-h-[100px] rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              placeholder="Décrire brièvement la tâche à réaliser"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Date d’échéance
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                min={today}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Priorité
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
