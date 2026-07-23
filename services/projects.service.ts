import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

import type { NewProject, Project, ProjectUpdate } from "@/types/project";

export interface ServiceResult {
  error: PostgrestError | null;
}

export interface GetProjectsResult extends ServiceResult {
  data: Project[];
}

/**
 * Récupère la liste des projets.
 *
 * @param options.orderByCreatedAtDesc Si true, trie du plus récent au plus
 * ancien (comportement utilisé par app/projects/page.tsx). Si false/absent,
 * retourne l'ordre par défaut de la base (comportement utilisé par la liste
 * déroulante de app/tasks/page.tsx).
 */
export async function getProjects(
  options?: { orderByCreatedAtDesc?: boolean }
): Promise<GetProjectsResult> {
  let query = supabase.from("projects").select("*");

  if (options?.orderByCreatedAtDesc) {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  return { data: (data as Project[]) ?? [], error };
}


/**
 * Crée un nouveau projet.
 */
export async function createProject(
  project: NewProject
): Promise<ServiceResult> {
  const { error } = await supabase.from("projects").insert(project);
  return { error };
}

/**
 * Met à jour un projet existant (titre, description, échéance).
 */
export async function updateProject(
  id: string,
  updates: ProjectUpdate
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  return { error };
}

/**
 * Supprime un projet.
 */
export async function deleteProject(id: string): Promise<ServiceResult> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  return { error };
}
