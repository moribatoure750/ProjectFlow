import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";

/**
 * Service du profil utilisateur (Lot 9).
 *
 * Volontairement indépendant de `services/auth.service.ts` :
 * `auth.service.ts` gère le cycle de vie de la session (connexion,
 * inscription, déconnexion), tandis que `profile.service.ts` gère la
 * lecture/modification du profil d'un utilisateur déjà authentifié.
 *
 * Aucune table `profiles` : toutes les données proviennent de
 * `auth.users` / `user_metadata` via `supabase.auth.getUser()` /
 * `updateUser()`.
 */

export interface GetProfileResult {
  data: UserProfile | null;
  error: AuthError | null;
}

export interface UpdateProfileResult {
  error: AuthError | null;
}

/**
 * Récupère le profil de l'utilisateur courant, en revalidant la
 * session auprès de Supabase (`getUser()`, jamais une lecture locale
 * du cookie) — même principe que `getRequiredUserId()` /
 * `getCurrentUserSummary()` déjà utilisés ailleurs dans l'app.
 */
export async function getProfile(): Promise<GetProfileResult> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { data: null, error };
  }

  const metadata = data.user.user_metadata as Record<string, unknown>;
  const displayName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    null;

  return {
    data: {
      id: data.user.id,
      email: data.user.email ?? "",
      displayName,
      createdAt: data.user.created_at ?? null,
    },
    error: null,
  };
}

/**
 * Met à jour le nom d'affichage de l'utilisateur courant
 * (`user_metadata.full_name`) — seul champ modifiable dans ce lot.
 */
export async function updateDisplayName(
  displayName: string
): Promise<UpdateProfileResult> {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: displayName },
  });

  return { error };
}
