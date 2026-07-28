"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CalendarIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@/components/ui/icons";

import { formatDate } from "@/lib/format";
import { projectStatusInfo } from "@/lib/badge-tones";
import { cn } from "@/lib/utils";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import type { Project, ProjectStatus } from "@/types/project";
import type { TaskWithProject } from "@/types/task";

type StatusFilter = "all" | ProjectStatus;

/** Discreet danger action, kept local (not the shared Button variant) so
 * that "Supprimer" no longer visually dominates the card like a solid
 * `danger` button would, while remaining clearly identifiable as
 * destructive in both Light and Dark mode. */
const dangerGhostClasses =
  "text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-600 dark:hover:bg-danger-100/10 dark:hover:text-danger-600";

function SkeletonProjectCard() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <LoadingSkeleton className="h-5 w-2/3" />
        <LoadingSkeleton className="h-5 w-16 rounded-full" />
      </div>
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-1/2" />
      <LoadingSkeleton className="h-4 w-2/5" />
      <div className="space-y-1.5 border-t border-border pt-3">
        <LoadingSkeleton className="h-3 w-1/3" />
        <LoadingSkeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex gap-2 border-t border-border pt-3">
        <LoadingSkeleton className="h-9 flex-1 rounded-md" />
        <LoadingSkeleton className="h-9 flex-1 rounded-md" />
      </div>
    </Card>
  );
}

/**
 * ProjectProgress — real completion stats for a project, computed from
 * tasks already loaded on this page (no per-card request). Renders a
 * discreet "Aucune tâche" state when the project has no task yet, but
 * never fabricates a percentage.
 */
function ProjectProgress({ tasks }: { tasks: TaskWithProject[] }) {
  const total = tasks.length;

  if (total === 0) {
    return (
      <div className="border-t border-border pt-3">
        <p className="text-xs text-fg-subtle">Aucune tâche</p>
        <ProgressBar value={0} label="Progression" className="mt-1.5" />
      </div>
    );
  }

  const done = tasks.filter((t) => t.status?.trim().toLowerCase() === "done")
    .length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="border-t border-border pt-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-fg-muted">
        <span>
          {total} {total === 1 ? "tâche" : "tâches"} · {done} terminée
          {done === 1 ? "" : "s"}
        </span>
        <span className="font-semibold text-fg">{percent}%</span>
      </div>
      <ProgressBar value={percent} label="Progression du projet" />
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  function isFormValid() {
    if (!title.trim()) {
      alert("Le titre du projet est obligatoire.");
      return false;
    }

    if (!deadline) {
      alert("La date d'échéance est obligatoire.");
      return false;
    }

    if (deadline < today) {
      alert("La date d'échéance ne peut pas être antérieure à aujourd'hui.");
      return false;
    }

    return true;
  }

  async function loadData() {
    setLoading(true);
    const [projectsRes, tasksRes] = await Promise.all([
      getProjects({ orderByCreatedAtDesc: true }),
      getTasks(),
    ]);
    setLoading(false);

    if (projectsRes.error) {
      alert(projectsRes.error.message);
      return;
    }
    setProjects(projectsRes.data);

    if (tasksRes.error) {
      alert(tasksRes.error.message);
      return;
    }
    setTasks(tasksRes.data);
  }

  useEffect(() => {
    function runInitialLoad() {
      loadData();
    }
    runInitialLoad();
  }, []);

  /** Tasks grouped by project_id, computed once from the single tasks
   * fetch above — no additional request is made per card. */
  const tasksByProject = useMemo(() => {
    const map = new Map<string, TaskWithProject[]>();
    for (const task of tasks) {
      const list = map.get(task.project_id);
      if (list) {
        list.push(task);
      } else {
        map.set(task.project_id, [task]);
      }
    }
    return map;
  }, [tasks]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDeadline("");
    setEditingId(null);
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(p: Project) {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description ?? "");
    setDeadline(p.deadline);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    resetForm();
  }

  async function addProject() {
    if (!isFormValid()) return;

    setSubmitting(true);
    const { error } = await createProject({
      title,
      description,
      deadline,
      status: "active",
    });
    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Projet ajouté avec succès !");
    closeModal();
    loadData();
  }

  async function updateProjectHandler() {
    if (!isFormValid()) return;
    if (!editingId) return;

    setSubmitting(true);
    const { error } = await updateProject(editingId, {
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
    closeModal();
    loadData();
  }

  function openDeleteModal(p: Project) {
    setDeleteTarget(p);
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);
    const { error } = await deleteProject(deleteTarget.id);
    setDeleteSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Projet supprimé avec succès !");
    setDeleteTarget(null);
    loadData();
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Projets"
        description="Gérez vos projets académiques en un seul endroit"
        actions={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreateModal}>
            Nouveau projet
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          icon={<SearchIcon className="h-4 w-4" />}
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="sm:w-48"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="completed">Terminé</option>
          <option value="archived">Archivé</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="h-10 w-10" />}
          title={
            projects.length === 0
              ? "Aucun projet pour le moment"
              : "Aucun résultat"
          }
          description={
            projects.length === 0
              ? "Créez votre premier projet pour commencer."
              : "Essayez de modifier vos filtres de recherche."
          }
          action={
            projects.length === 0 ? (
              <Button
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={openCreateModal}
              >
                Créer un projet
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => {
            const statusInfo = projectStatusInfo(p.status);
            const projectTasks = tasksByProject.get(p.id) ?? [];
            return (
              <Card
                key={p.id}
                hoverable
                className="flex flex-col overflow-hidden p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-base font-semibold leading-snug text-fg">
                    {p.title}
                  </h3>
                  <Badge tone={statusInfo.tone} className="mt-0.5 shrink-0">
                    {statusInfo.label}
                  </Badge>
                </div>

                <p className="mb-3 line-clamp-2 text-sm text-fg-muted">
                  {p.description || "Aucune description."}
                </p>

                <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-fg">
                  <CalendarIcon className="h-4 w-4 text-fg-subtle" />
                  Échéance : {formatDate(p.deadline)}
                </p>

                <ProjectProgress tasks={projectTasks} />

                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<PencilIcon className="h-3.5 w-3.5" />}
                    onClick={() => openEditModal(p)}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon className="h-3.5 w-3.5" />}
                    onClick={() => openDeleteModal(p)}
                    className={cn(dangerGhostClasses, "flex-1")}
                  >
                    Supprimer
                  </Button>
                </div>

                <Link
                  href={`/projects/${p.id}`}
                  className="mt-2 flex items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium text-accent transition-colors duration-150 hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ouvrir
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>

              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Modifier le projet" : "Nouveau projet"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={editingId ? updateProjectHandler : addProject}
              loading={submitting}
            >
              {editingId ? "Mettre à jour" : "Créer le projet"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Titre
            </label>
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
        open={deleteTarget !== null}
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
          <span className="font-semibold text-fg">
            {deleteTarget?.title}
          </span>{" "}
          ? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  );
}
