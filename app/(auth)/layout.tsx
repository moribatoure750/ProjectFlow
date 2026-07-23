import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/supabase/session";

/**
 * Layout du groupe de routes `(auth)` — pages publiques d'authentification
 * (login, register, forgot-password, reset-password). Volontairement
 * minimal : pas de Sidebar/Header (contrairement au groupe `(app)`), juste
 * un conteneur centré dans lequel chaque page place sa propre carte
 * (voir `components/auth/AuthCard.tsx`, ajouté au Lot 3).
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {children}
    </div>
  );
}
