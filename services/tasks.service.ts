import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { NewTask, TaskStatus, TaskWithProject } from "@/types/task";

export interface ServiceResult {
  error: PostgrestError | null;
}

export interface GetTasksResult extends ServiceResult {
  data: TaskWithProject[];
}

/**
 * Récupère la liste des tâches avec le titre du projet associé,
 * triées de la plus récente à la plus ancienne.
 */
export async function getTasks(): Promise<GetTasksResult> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(title)")
    .order("created_at", { ascending: false });

  return { data: (data as TaskWithProject[]) ?? [], error };
}

/**
 * Crée une nouvelle tâche.
 */
export async function createTask(task: NewTask): Promise<ServiceResult> {
  const { error } = await supabase.from("tasks").insert(task);
  return { error };
}

/**
 * Met à jour uniquement le statut d'une tâche (todo / doing / done).
 */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id);

  return { error };
}

/**
 * Supprime une tâche.
 */
export async function deleteTask(id: string): Promise<ServiceResult> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  return { error };
}
