"use client";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

/**
 * ThemeToggle — bascule Light Mode / Dark Mode du Design System
 * ProjectFlow. Bouton icône unique (soleil/lune) suivant le même gabarit
 * visuel que `NotificationBell`/`UserMenu` (cercle 36px, focus ring,
 * hover `surface-hover`), monté dans le `Header` (app) et le layout
 * `(auth)`.
 *
 * `aria-pressed` reflète l'état "sombre actif" pour les lecteurs d'écran ;
 * le libellé du bouton décrit toujours l'action à venir (et non l'état
 * courant), conformément aux autres contrôles du Design System.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className
      )}
    >
      {isDark ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
