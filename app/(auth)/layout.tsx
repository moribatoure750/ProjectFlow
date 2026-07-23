import type { ReactNode } from "react";

/**
 * Layout du groupe de routes `(auth)` — pages publiques d'authentification
 * (login, register, forgot-password, reset-password). Volontairement
 * minimal : pas de Sidebar/Header (contrairement au groupe `(app)`), juste
 * un conteneur centré dans lequel chaque page place sa propre carte
 * (voir `components/auth/AuthCard.tsx`, ajouté au Lot 3).
 */
export default function AuthGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {children}
    </div>
  );
}
