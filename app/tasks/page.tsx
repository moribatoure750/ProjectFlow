"use client";

import { useEffect, useState } from "react";
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

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const today = new Date().toISOString().split("T")[0];

  const columns: { key: TaskStatus; label: string; empty: string }[] = [
    { key: "todo", label: "À faire", empty: "📌 Aucun projet à faire" },
    { key: "doing", label: "En cours", empty: "🚀 Aucun projet en cours" },
    { key: "done", label: "Terminé", empty: "✅ Aucun projet terminé" },
  ];

  function cleanStatus(status: string) {
    return status?.trim().toLowerCase();
  }

  function statusLabel(status: string) {
    const s = cleanStatus(status);
    if (s === "todo") return "À faire";
    if (s === "doing") return "En cours";
    if (s === "done") return "Terminé";
    return "Inconnu";
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
    const { data, error } = await getTasks();

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
    setProjectId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    loadTasks();
  }

  async function changeStatus(id: string, newStatus: TaskStatus) {
    const { error } = await updateTaskStatus(id, newStatus);

    if (error) return alert(error.message);
    loadTasks();
  }

  async function deleteTaskHandler(id: string) {
    if (!confirm("Voulez-vous supprimer cette tâche ?")) return;

    const { error } = await deleteTask(id);
    if (error) return alert(error.message);

    alert("Tâche supprimée !");
    loadTasks();
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "30px" }}>
        Gestion des tâches
      </h1>

      <div
        style={{
          maxWidth: "850px",
          padding: "30px",
          border: "2px solid #d1d5db",
          borderRadius: "18px",
          background: "#ffffff",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          marginBottom: "50px",
        }}
      >
        <h2
          style={{
            fontSize: "34px",
            fontWeight: "bold",
            marginBottom: "30px",
            borderBottom: "2px solid #eee",
            paddingBottom: "15px",
          }}
        >
          Ajouter une nouvelle tâche
        </h2>

        <div style={{ border: "1px solid #ddd", padding: "18px", borderRadius: "10px", marginBottom: "18px" }}>
          <label style={{ fontWeight: "bold" }}>Projet associé</label>
          <select
            style={{ width: "100%", padding: "14px", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
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

        <div style={{ border: "1px solid #ddd", padding: "18px", borderRadius: "10px", marginBottom: "18px" }}>
          <label style={{ fontWeight: "bold" }}>Titre de la tâche</label>
          <input
            style={{ width: "100%", padding: "14px", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            placeholder="Exemple : Rédiger le rapport"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ border: "1px solid #ddd", padding: "18px", borderRadius: "10px", marginBottom: "18px" }}>
          <label style={{ fontWeight: "bold" }}>Description</label>
          <textarea
            style={{ width: "100%", padding: "14px", marginTop: "10px", minHeight: "120px", borderRadius: "8px", border: "1px solid #ccc" }}
            placeholder="Décrire brièvement la tâche à réaliser"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "25px" }}>
          <div style={{ border: "1px solid #ddd", padding: "18px", borderRadius: "10px" }}>
            <label style={{ fontWeight: "bold" }}>Date d’échéance</label>
            <input
              style={{ width: "100%", padding: "14px", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              type="date"
              min={today}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div style={{ border: "1px solid #ddd", padding: "18px", borderRadius: "10px" }}>
            <label style={{ fontWeight: "bold" }}>Priorité</label>
            <select
              style={{ width: "100%", padding: "14px", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Élevée</option>
            </select>
          </div>
        </div>

        <button
          onClick={addTask}
          style={{
            width: "100%",
            padding: "16px",
            background: "#111827",
            color: "white",
            fontSize: "18px",
            borderRadius: "10px",
            fontWeight: "bold",
          }}
        >
          Ajouter la tâche
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {columns.map((column) => {
          const columnTasks = tasks.filter(
            (task) => cleanStatus(task.status) === column.key
          );

          return (
            <div
              key={column.key}
              style={{
                border: "1px solid black",
                borderRadius: "6px",
                padding: "20px",
              }}
            >
              <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>
                {column.label}
              </h2>

              {columnTasks.length === 0 ? (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "40px 20px",
                    textAlign: "center",
                    border: "2px dashed #d1d5db",
                    borderRadius: "12px",
                    background: "#f9fafb",
                    color: "#6b7280",
                    fontWeight: "bold",
                  }}
                >
                  {column.empty}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      border: "1px solid black",
                      borderRadius: "6px",
                      padding: "20px",
                      marginTop: "20px",
                    }}
                  >
                    <h3 style={{ fontWeight: "bold" }}>{task.title}</h3>

                    <p>{task.description}</p>
                    <p>Projet : {task.projects?.title}</p>
                    <p>Échéance : {task.due_date}</p>
                    <p>Priorité : {task.priority}</p>

                    <p style={{ fontWeight: "bold", marginTop: "15px" }}>
                      Statut actuel : {statusLabel(task.status)}
                    </p>

                    <p style={{ fontWeight: "bold", marginTop: "15px" }}>
                      Déplacer vers :
                    </p>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {cleanStatus(task.status) !== "todo" && (
                        <button
                          onClick={() => changeStatus(task.id, "todo")}
                          style={{
                            backgroundColor: "#4b5563",
                            color: "white",
                            padding: "10px 14px",
                            borderRadius: "6px",
                          }}
                        >
                          À faire
                        </button>
                      )}

                      {cleanStatus(task.status) !== "doing" && (
                        <button
                          onClick={() => changeStatus(task.id, "doing")}
                          style={{
                            backgroundColor: "#2563eb",
                            color: "white",
                            padding: "10px 14px",
                            borderRadius: "6px",
                          }}
                        >
                          En cours
                        </button>
                      )}

                      {cleanStatus(task.status) !== "done" && (
                        <button
                          onClick={() => changeStatus(task.id, "done")}
                          style={{
                            backgroundColor: "#16a34a",
                            color: "white",
                            padding: "10px 14px",
                            borderRadius: "6px",
                          }}
                        >
                          Terminé
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => deleteTaskHandler(task.id)}
                      style={{
                        marginTop: "15px",
                        backgroundColor: "red",
                        color: "white",
                        padding: "10px 14px",
                        borderRadius: "6px",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
