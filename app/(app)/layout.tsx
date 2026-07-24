import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUserSummary, hasValidSession } from "@/lib/supabase/session";


/**
 * Layout du groupe de routes `(app)` — regroupe toutes les pages privées
 * de l'application (dashboard, projets, tâches, réunions, profil) sous
 * l'AppShell (Sidebar + Header). Ce layout ne s'applique pas aux pages du
 * groupe `(auth)` (login, register, etc.), qui n'ont pas de Sidebar/Header.
 *
 * Les groupes de routes `(app)`/`(auth)` (parenthèses) n'affectent pas les
 * URLs : `/`, `/projects`, `/tasks`, `/meetings` restent identiques.
 *
 * Barrière serveur "defense in depth" : `proxy.ts` redirige déjà les
 * requêtes non authentifiées vers `/login` avant même d'atteindre ce
 * layout, mais cette vérification est refaite ici (Server Component, pas
 * de `useEffect`) au cas où le proxy serait contourné, mal configuré, ou
 * non exécuté selon la plateforme de déploiement.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  // `hasValidSession()` garantit déjà qu'une session valide existe ; en
  // cas de scénario limite (session invalidée entre les deux appels),
  // `getCurrentUserSummary()` retourne `null` et on retombe vers /login
  // plutôt que de rendre le Header avec un utilisateur manquant.
  const user = await getCurrentUserSummary();
  if (!user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}

