"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { NotificationBell } from "@/components/notifications/NotificationBell";

import { MenuIcon, SearchIcon } from "@/components/ui/icons";
import { BRAND } from "@/lib/brand";
import type { CurrentUserSummary } from "@/lib/supabase/session";
import { UserMenu } from "./UserMenu";


const titles: Record<string, string> = {
  "/": "Accueil",
  "/projects": "Projets",
  "/tasks": "Tâches",
  "/meetings": "Réunions",
  "/notifications": "Notifications",
};



interface HeaderProps {
  onMenuClick: () => void;
  /** Ouvre la palette de recherche globale (Lot 12) — déclenchée soit
   *  par ce bouton, soit par Ctrl/Cmd+K (écouté par `AppShell`). */
  onOpenSearch: () => void;
  user: CurrentUserSummary;
}

export function Header({ onMenuClick, onOpenSearch, user }: HeaderProps) {
  const pathname = usePathname();

  const title = titles[pathname] ?? BRAND.name;

  /** Raccourci clavier affiché : macOS utilise le symbole ⌘, les
   *  autres plateformes (Windows/Linux) affichent "Ctrl". Calculé une
   *  seule fois via un initialiseur paresseux (`navigator` est absent
   *  côté serveur, d'où la valeur par défaut "Ctrl K"). */
  const [shortcutLabel] = useState(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    return isMac ? "⌘ K" : "Ctrl K";
  });





  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-fg-muted transition-colors duration-150 hover:bg-surface-hover lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="font-medium text-fg">{title}</span>
      </div>

      {/* Mobile : simple bouton icône (la barre texte ci-dessous est masquée en dessous de sm). */}
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label={`Rechercher (${shortcutLabel})`}
        className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:hidden"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {/* Desktop/tablette : barre de recherche cliquable + rappel du raccourci. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-left text-sm text-fg-subtle transition-colors duration-150 hover:border-fg-subtle hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:flex"
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1">Rechercher...</span>
        <kbd className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">
          {shortcutLabel}
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserMenu user={user} />
      </div>


    </header>
  );
}
