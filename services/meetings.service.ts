import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";

import type {
  MeetingStatus,
  MeetingUpdate,
  MeetingWithProject,
  NewMeeting,
} from "@/types/meeting";

export interface ServiceResult {
  error: PostgrestError | null;
}

export interface GetMeetingsResult extends ServiceResult {
  data: MeetingWithProject[];
}

export interface GetMeetingResult extends ServiceResult {
  data: MeetingWithProject | null;
}


/** Erreur renvoyée quand `project_id` ne correspond à aucun projet de
 *  l'utilisateur courant (Lot 7 — vérification applicative, en
 *  attendant la RLS du Lot 8). Même pattern que
 *  services/tasks.service.ts. */
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
 * avant de créer/déplacer une réunion vers ce projet.
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
 * Récupère la liste des réunions de l'utilisateur courant, avec le
 * titre du projet associé, triées de la plus proche à la plus
 * lointaine dans le temps.
 */
export async function getMeetings(): Promise<GetMeetingsResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("meetings")
    .select("*, projects(title)")
    .eq("user_id", userId)
    .order("starts_at", { ascending: true });

  return { data: (data as MeetingWithProject[]) ?? [], error };
}

/**
 * Récupère une réunion précise par son id, avec le titre du projet
 * associé, uniquement si elle appartient à l'utilisateur courant
 * (Lot 14A — page de détail `/meetings/[id]`). Retourne `data: null`
 * sans erreur si la réunion n'existe pas ou n'appartient pas à
 * l'utilisateur.
 */
export async function getMeetingById(id: string): Promise<GetMeetingResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("meetings")
    .select("*, projects(title)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return { data: (data as MeetingWithProject | null) ?? null, error };
}

/**
 * Crée une nouvelle réunion, associée automatiquement à l'utilisateur
 * courant, après vérification que le projet cible lui appartient bien.
 */

export async function createMeeting(
  meeting: NewMeeting
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsProject(
    meeting.project_id,
    userId
  );
  if (ownershipCheckError) {
    return { error: ownershipCheckError };
  }

  const { error } = await supabase
    .from("meetings")
    .insert({ ...meeting, user_id: userId });

  return { error };
}

/**
 * Met à jour une réunion existante (titre, description, lieu, lien,
 * dates de début/fin, projet), uniquement si elle appartient à
 * l'utilisateur courant. Revérifie aussi la propriété du projet cible,
 * car `MeetingUpdate` permet de changer `project_id`.
 */
export async function updateMeeting(
  id: string,
  updates: MeetingUpdate
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsProject(
    updates.project_id,
    userId
  );
  if (ownershipCheckError) {
    return { error: ownershipCheckError };
  }

  const { error } = await supabase
    .from("meetings")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  return { error };
}

/**
 * Met à jour uniquement le statut d'une réunion
 * (planned / completed / cancelled), uniquement si elle appartient à
 * l'utilisateur courant.
 */
export async function updateMeetingStatus(
  id: string,
  status: MeetingStatus
): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { error } = await supabase
    .from("meetings")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);

  return { error };
}

/**
 * Supprime une réunion, uniquement si elle appartient à l'utilisateur
 * courant.
 */
export async function deleteMeeting(id: string): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  return { error };
}
