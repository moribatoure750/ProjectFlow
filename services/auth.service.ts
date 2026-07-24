import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface AuthResult {
  error: AuthError | null;
  /**
   * `true` uniquement pour `signUp()` lorsque Supabase n'a pas retourné de
   * session immédiate (confirmation d'email activée côté dashboard) : la
   * page appelante doit alors afficher un message "vérifiez votre boîte
   * mail" plutôt que de rediriger.
   */
  needsEmailConfirmation?: boolean;
}

export interface GetCurrentUserResult {
  user: User | null;
  error: AuthError | null;
}

/**
 * Connecte un utilisateur avec email/mot de passe.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error };
}

/**
 * Inscrit un nouvel utilisateur avec email/mot de passe.
 *
 * Selon la configuration Supabase (Auth > Providers > Email > "Confirm
 * email"), la réponse contient soit une session immédiate (confirmation
 * désactivée), soit un utilisateur sans session (confirmation activée) —
 * `needsEmailConfirmation` reflète ce second cas.
 *
 * `emailRedirectTo` (optionnel) est le lien vers lequel Supabase
 * redirigera l'utilisateur après avoir cliqué sur le lien de
 * confirmation reçu par email (Lot 5, voir
 * `app/auth/callback/route.ts`). Volontairement non calculé ici : ce
 * service reste indépendant du navigateur (`window.location.origin`)
 * pour rester simple à tester ; c'est à l'appelant (page Register) de
 * construire cette URL et de la transmettre.
 */
export async function signUp(
  email: string,
  password: string,
  emailRedirectTo?: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    return { error };
  }

  return { error: null, needsEmailConfirmation: !data.session };
}

/**
 * Récupère l'utilisateur actuellement connecté (côté client), en
 * revalidant le JWT auprès de Supabase (plus fiable que de lire la
 * session locale, qui peut être expirée ou falsifiée côté client).
 */
export async function getCurrentUser(): Promise<GetCurrentUserResult> {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

/**
 * Déconnecte l'utilisateur courant.
 *
 * Exposé pour compléter la structure du service ; non branché à
 * l'interface dans ce lot (voir Lot 6 — session côté UI).
 */
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error };
}
