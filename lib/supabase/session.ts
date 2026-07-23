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
