import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

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

/**
 * Récupère la liste des réunions avec le titre du projet associé,
 * triées de la plus proche à la plus lointaine dans le temps.
 */
export async function getMeetings(): Promise<GetMeetingsResult> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*, projects(title)")
    .order("starts_at", { ascending: true });

  return { data: (data as MeetingWithProject[]) ?? [], error };
}

/**
 * Crée une nouvelle réunion.
 */
export async function createMeeting(
  meeting: NewMeeting
): Promise<ServiceResult> {
  const { error } = await supabase.from("meetings").insert(meeting);
  return { error };
}

/**
 * Met à jour une réunion existante (titre, description, lieu, lien,
 * dates de début/fin).
 */
export async function updateMeeting(
  id: string,
  updates: MeetingUpdate
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("meetings")
    .update(updates)
    .eq("id", id);

  return { error };
}

/**
 * Met à jour uniquement le statut d'une réunion
 * (planned / completed / cancelled).
 */
export async function updateMeetingStatus(
  id: string,
  status: MeetingStatus
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("meetings")
    .update({ status })
    .eq("id", id);

  return { error };
}

/**
 * Supprime une réunion.
 */
export async function deleteMeeting(id: string): Promise<ServiceResult> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  return { error };
}
