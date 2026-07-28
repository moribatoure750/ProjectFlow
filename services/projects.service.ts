import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";

import type { NewProject, Project, ProjectUpdate } from "@/types/project";

export interface ServiceResult {
  error: PostgrestError | null;
}

export interface GetProjectsResult extends ServiceResult {
  data: Project[];
}

export interface GetProjectResult extends ServiceResult {
  data: Project | null;
}


/**
 * Récupère la liste des projets appartenant à l'utilisateur courant
 * (Lot 7 — préparation du modèle multi-utilisateur ; le filtre
 * `.eq("user_id", ...)` est une mesure applicative, la RLS n'est pas
 * encore activée — voir Lot 8).
 *
 * @param options.orderByCreatedAtDesc Si true, trie du plus récent au plus
 * ancien (comportement utilisé par app/projects/page.tsx). Si false/absent,
 * retourne l'ordre par défaut de la base (comportement utilisé par la liste
 * déroulante de app/tasks/page.tsx).
 */
export async function getProjects(
  options?: { orderByCreatedAtDesc?: boolean }
): Promise<GetProjectsResult> {
  const userId = await getRequiredUserId();

  let query = supabase.from("projects").select("*").eq("user_id", userId);

  if (options?.orderByCreatedAtDesc) {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  return { data: (data as Project[]) ?? [], error };
}


/**
 * Récupère un projet précis par son id, uniquement s'il appartient à
 * l'utilisateur courant (Lot 14A — page de détail `/projects/[id]`).
 * Retourne `data: null` sans erreur si le projet n'existe pas ou
 * n'appartient pas à l'utilisateur — la page appelante distingue ce
 * cas de l'état "chargement" pour afficher un état "introuvable".
 */
export async function getProjectById(id: string): Promise<GetProjectResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return { data: (data as Project | null) ?? null, error };
}

/**
 * Crée un nouveau projet, associé automatiquement à l'utilisateur
 * courant (jamais fourni par l'appelant).
 */

export async function createProject(
  project: NewProject
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { error } = await supabase
    .from("projects")
    .insert({ ...project, user_id: userId });

  return { error };
}

/**
 * Met à jour un projet existant (titre, description, échéance),
 * uniquement s'il appartient à l'utilisateur courant.
 */
export async function updateProject(
  id: string,
  updates: ProjectUpdate
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  return { error };
}

/**
 * Supprime un projet, uniquement s'il appartient à l'utilisateur
 * courant.
 */
export async function deleteProject(id: string): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  return { error };
}
