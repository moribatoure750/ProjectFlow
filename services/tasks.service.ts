import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";
import { logActivity } from "@/services/activity.service";

import type { NewTask, TaskStatus, TaskUpdate, TaskWithProject } from "@/types/task";



export interface ServiceResult {
  error: PostgrestError | null;
}

export interface GetTasksResult extends ServiceResult {
  data: TaskWithProject[];
}

export interface GetTaskResult extends ServiceResult {
  data: TaskWithProject | null;
}


/** Erreur renvoyée quand `project_id` ne correspond à aucun projet de
 *  l'utilisateur courant (Lot 7 — vérification applicative, en
 *  attendant la RLS du Lot 8). Construite à la main : ce n'est pas une
 *  erreur PostgREST réelle, mais le seul canal d'erreur exposé par
 *  `ServiceResult` — les pages appelantes affichent déjà `error.message`
 *  sans distinguer son origine. */
function ownershipError(message: string): PostgrestError {
  return {
    message,
    details: "",
    hint: "",
    code: "42501",
    name: "PostgrestError",
    toJSON() {
      return { message, details: "", hint: "", code: "42501", name: "PostgrestError" };
    },
  };
}


/**
 * Vérifie que `projectId` appartient bien à l'utilisateur courant,
 * avant de créer/déplacer une tâche vers ce projet. Sans cette
 * vérification, un utilisateur pourrait associer une tâche à un
 * project_id appartenant à un autre compte (le `<select>` du
 * formulaire est déjà filtré par `getProjects()`, donc ce cas ne peut
 * survenir que via une requête forgée directement).
 */
async function assertOwnsProject(
  projectId: string,
  userId: string
): Promise<PostgrestError | null> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return ownershipError("Projet introuvable ou non autorisé.");
  }
  return null;
}

/**
 * Récupère la liste des tâches de l'utilisateur courant, avec le titre
 * du projet associé, triées de la plus récente à la plus ancienne.
 */
export async function getTasks(): Promise<GetTasksResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: (data as TaskWithProject[]) ?? [], error };
}

/**
 * Récupère une tâche précise par son id, avec le titre du projet
 * associé, uniquement si elle appartient à l'utilisateur courant
 * (Lot 14A — page de détail `/tasks/[id]`). Retourne `data: null` sans
 * erreur si la tâche n'existe pas ou n'appartient pas à l'utilisateur.
 */
export async function getTaskById(id: string): Promise<GetTaskResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(title)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return { data: (data as TaskWithProject | null) ?? null, error };
}

/**
 * Crée une nouvelle tâche, associée automatiquement à l'utilisateur
 * courant, après vérification que le projet cible lui appartient bien.
 */

export async function createTask(task: NewTask): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsProject(task.project_id, userId);
  if (ownershipCheckError) {
    return { error: ownershipCheckError };
  }

  // `.select("id").single()` ajouté (Lot 16B) uniquement pour obtenir
  // l'id de la tâche créée, nécessaire à la journalisation ci-dessous.
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: userId })
    .select("id")
    .single();

  if (!error && data) {
    await logActivity("task", data.id, "created", { title: task.title });
  }

  return { error };
}


/**
 * Met à jour les champs modifiables d'une tâche (titre, description,
 * échéance, priorité, projet), uniquement si elle appartient à
 * l'utilisateur courant (Lot 14A — page de détail `/tasks/[id]`).
 * Revérifie aussi la propriété du projet cible, car `TaskUpdate`
 * permet de changer `project_id` — même pattern que
 * `updateMeeting()` dans services/meetings.service.ts.
 */
export async function updateTask(
  id: string,
  updates: TaskUpdate
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsProject(updates.project_id, userId);
  if (ownershipCheckError) {
    return { error: ownershipCheckError };
  }

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  return { error };
}

/**
 * Met à jour uniquement le statut d'une tâche (todo / doing / done),
 * uniquement si elle appartient à l'utilisateur courant.
 */
export async function updateTaskStatus(

  id: string,
  status: TaskStatus
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  // Lecture préalable du statut actuel (Lot 16B) : un simple
  // `UPDATE ... RETURNING` ne renverrait que le *nouveau* statut,
  // alors que la métadonnée `oldStatus` exige l'ancienne valeur.
  const { data: existing } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);

  if (!error) {
    await logActivity("task", id, "status_changed", {
      oldStatus: existing?.status ?? null,
      newStatus: status,
    });
  }

  return { error };
}

/**
 * Supprime une tâche, uniquement si elle appartient à l'utilisateur
 * courant.
 */
export async function deleteTask(id: string): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  // `.select("title").maybeSingle()` ajouté (Lot 16B) pour récupérer,
  // dans la même requête, le titre de la tâche effectivement supprimée.
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("title")
    .maybeSingle();

  if (!error) {
    await logActivity("task", id, "deleted", { title: data?.title ?? null });
  }

  return { error };
}

