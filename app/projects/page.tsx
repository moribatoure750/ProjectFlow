"use client";

import { useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/services/projects.service";
import type { Project } from "@/types/project";

export default function ProjectsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const { data, error } = await getProjects({ orderByCreatedAtDesc: true });
    if (error) {
      alert(error.message);
      return;
    }
    setProjects(data);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function addProject() {
    if (!isFormValid()) return;

    const { error } = await createProject({
      title,
      description,
      deadline,
      status: "active",
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Projet ajouté avec succès !");
      setTitle("");
      setDescription("");
      setDeadline("");
      loadProjects();
    }
  }

  function editProject(p: Project) {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description ?? "");
    setDeadline(p.deadline);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateProjectHandler() {
    if (!isFormValid()) return;
    if (!editingId) return;

    const { error } = await updateProject(editingId, {
      title,
      description,
      deadline,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Projet mis à jour avec succès !");
      setEditingId(null);
      setTitle("");
      setDescription("");
      setDeadline("");
      loadProjects();
    }
  }

  async function deleteProjectHandler(id: string) {
    const confirmation = confirm("Voulez-vous vraiment supprimer ce projet ?");

    if (!confirmation) return;

    const { error } = await deleteProject(id);
    if (error) {
      alert(error.message);
      return;
    }

    alert("Projet supprimé avec succès !");
    loadProjects();
  }

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-8">Mes projets</h1>

      <div className="space-y-4 max-w-2xl">
        <input
          className="border p-3 w-full rounded"
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border p-3 w-full rounded"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          className="border p-3 w-full rounded"
          type="date"
          min={today}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <button
          className="bg-black text-white px-5 py-3 rounded"
          onClick={editingId ? updateProjectHandler : addProject}
        >
          {editingId ? "Mettre à jour" : "Ajouter"}
        </button>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Projets enregistrés</h2>

        <div className="space-y-4">
          {projects.map((p) => (
            <div key={p.id} className="border p-4 rounded">
              <h3 className="font-bold">{p.title}</h3>

              <p>{p.description}</p>

              <p>Créé le : {new Date(p.created_at).toLocaleDateString()}</p>

              <p>Échéance : {p.deadline}</p>

              <button
                className="mt-3 mr-2 bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => editProject(p)}
              >
                Modifier
              </button>

              <button
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
                onClick={() => deleteProjectHandler(p.id)}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
