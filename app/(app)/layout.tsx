import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Layout du groupe de routes `(app)` — regroupe toutes les pages privées
 * de l'application (dashboard, projets, tâches, réunions, profil) sous
 * l'AppShell (Sidebar + Header). Ce layout ne s'applique pas aux pages du
 * groupe `(auth)` (login, register, etc.), qui n'ont pas de Sidebar/Header.
 *
 * Les groupes de routes `(app)`/`(auth)` (parenthèses) n'affectent pas les
 * URLs : `/`, `/projects`, `/tasks`, `/meetings` restent identiques.
 */
export default function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
