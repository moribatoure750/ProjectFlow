import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/supabase/session";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Layout du groupe de routes `(auth)` — pages publiques d'authentification
 * (login, register, forgot-password, reset-password). Volontairement
 * minimal : pas de Sidebar/Header (contrairement au groupe `(app)`), juste
 * un conteneur centré dans lequel chaque page place sa propre carte
 * (voir `components/auth/AuthCard.tsx`, ajouté au Lot 3).
 *
 * `ThemeToggle` est repris ici en position fixe (coin supérieur droit) car
 * ce groupe de routes n'a pas de `Header` : le Dark Mode doit rester
 * accessible avant même la connexion (Design System ProjectFlow).
 *
 * Barrière serveur "defense in depth" : `proxy.ts` redirige déjà les
 * requêtes déjà authentifiées vers `/` avant même d'atteindre ce layout,
 * mais cette vérification est refaite ici (Server Component) au cas où
 * le proxy serait contourné ou non exécuté.
 */
export default async function AuthGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await hasValidSession()) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
