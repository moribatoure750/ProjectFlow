import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie côté serveur si une session valide existe, en validant le JWT
 * via `getClaims()` (vérification cryptographique + expiration), jamais
 * via `getSession()` seul (qui ne fait que désérialiser le cookie local
 * sans le revalider).
 *
 * Utilisé comme "defense in depth" dans les layouts serveur `(app)` et
 * `(auth)`, en complément de `proxy.ts` qui gère la même vérification en
 * amont pour les redirections rapides.
 *
 * `getUser()` reste réservé aux besoins nécessitant le profil utilisateur
 * à jour (Header, page Profil) — pas utilisé ici.
 */
export async function hasValidSession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && data !== null;
}

/**
 * Résumé minimal de l'utilisateur courant transmis du layout serveur
 * `(app)` jusqu'au Header/UserMenu (Client Components) — volontairement
 * réduit à ce qui est affiché, jamais l'objet `User` Supabase complet.
 */
export interface CurrentUserSummary {
  email: string;
  /** Issu de `user_metadata.full_name` / `user_metadata.name`, sinon `null`
   *  (aucun de ces champs n'est renseigné par l'inscription actuelle —
   *  Lot 3 — mais un futur formulaire de profil pourrait les définir). */
  displayName: string | null;
}

/**
 * Récupère le résumé de l'utilisateur courant côté serveur, pour l'
 * affichage dans le Header (Lot 6). Utilise `getUser()` (et non
 * `getClaims()`, qui ne renvoie que les claims du JWT sans
 * `user_metadata`) — revalide auprès de Supabase, jamais une lecture de
 * cookie non vérifiée.
 *
 * Retourne `null` si aucun utilisateur n'est authentifié ; les appelants
 * de ce module (layout `(app)`) redirigent déjà vers `/login` dans ce
 * cas via `hasValidSession()`, donc ce cas ne devrait pas se présenter
 * en pratique, mais reste géré explicitement pour éviter toute exception.
 */
export async function getCurrentUserSummary(): Promise<CurrentUserSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const metadata = data.user.user_metadata as Record<string, unknown>;
  const displayName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    null;

  return {
    email: data.user.email ?? "",
    displayName,
  };
}

