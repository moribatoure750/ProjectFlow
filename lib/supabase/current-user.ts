import { supabase } from "@/lib/supabase/client";

/**
 * Récupère l'id de l'utilisateur courant, côté client, pour les
 * services `projects`/`tasks`/`meetings` (Lot 7 — préparation du
 * modèle multi-utilisateur).
 *
 * Centralisé ici pour qu'aucun composant React n'ait jamais à fournir
 * `user_id` lui-même : chaque service l'appelle en première ligne de
 * ses opérations `create*`/`get*`/`update*`/`delete*`.
 *
 * Utilise `getUser()` (revalide auprès de Supabase), pas `getSession()`
 * qui ne ferait que désérialiser le cookie local sans le revalider —
 * même principe que `lib/supabase/session.ts` côté serveur.
 *
 * Lève une exception si aucun utilisateur n'est authentifié : ces
 * services ne sont appelés que depuis les pages du groupe `(app)`,
 * déjà protégées par `proxy.ts` et le layout serveur
 * (`hasValidSession()`) — ce cas ne devrait donc jamais se produire en
 * pratique, mais reste un filet de sécurité explicite plutôt qu'un
 * `user_id` silencieusement `undefined` envoyé à Supabase.
 */
export async function getRequiredUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error(
      "Impossible de déterminer l'utilisateur courant : aucune session valide."
    );
  }

  return data.user.id;
}
