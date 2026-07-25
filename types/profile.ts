/**
 * Profil de l'utilisateur courant (Lot 9), entièrement dérivé de
 * Supabase Auth (`auth.users` / `user_metadata`) — aucune table
 * `profiles` dédiée n'existe dans ce projet : toutes les données
 * affichées ici sont déjà exposées par `supabase.auth.getUser()`.
 */
export interface UserProfile {
  id: string;
  email: string;
  /** Issu de `user_metadata.full_name` (ou `.name` en repli), `null`
   *  si jamais renseigné. */
  displayName: string | null;
  /** Date de création du compte (`auth.users.created_at`), `null` si
   *  absente pour une raison quelconque. */
  createdAt: string | null;
}

/** Seul champ modifiable par l'utilisateur dans ce lot. */
export type ProfileUpdate = {
  displayName: string;
};
