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
import { Textarea } from "@/components/ui/Textarea";
import {
  CalendarIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import { projectStatusInfo } from "@/lib/badge-tones";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/services/projects.service";
import type { Project, ProjectStatus } from "@/types/project";

type StatusFilter = "all" | ProjectStatus;

function SkeletonProjectCard() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <LoadingSkeleton className="h-5 w-2/3" />
        <LoadingSkeleton className="h-5 w-16 rounded-full" />
      </div>
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-1/2" />
      <div className="flex gap-2 border-t border-border pt-3">
        <LoadingSkeleton className="h-9 flex-1 rounded-md" />
        <LoadingSkeleton className="h-9 flex-1 rounded-md" />
      </div>
    </Card>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
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

  async function loadProjects() {
    setLoading(true);
    const { data, error } = await getProjects({ orderByCreatedAtDesc: true });
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    setProjects(data);
  }

  useEffect(() => {
    loadProjects();
  }, []);

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
    loadProjects();
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
    loadProjects();
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
    loadProjects();
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
            return (
              <Card key={p.id} hoverable className="flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-fg">{p.title}</h3>
                  <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                </div>

                <p className="mb-4 line-clamp-2 flex-1 text-sm text-fg-muted">
                  {p.description || "Aucune description."}
                </p>

                <p className="mb-4 flex items-center gap-1.5 text-xs text-fg-subtle">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Échéance : {formatDate(p.deadline)}
                </p>

                <div className="flex gap-2 border-t border-border pt-3">
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
                    variant="danger"
                    size="sm"
                    icon={<TrashIcon className="h-3.5 w-3.5" />}
                    onClick={() => openDeleteModal(p)}
                    className="flex-1"
                  >
                    Supprimer
                  </Button>
                </div>
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
