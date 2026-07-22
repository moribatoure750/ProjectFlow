"use client";

import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { MenuIcon, SearchIcon } from "@/components/ui/icons";
import { BRAND } from "@/lib/brand";

const titles: Record<string, string> = {
  "/": "Accueil",
  "/projects": "Projets",
  "/tasks": "Tâches",
  "/meetings": "Réunions",
};


interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = titles[pathname] ?? BRAND.name;

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

      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-fg-subtle sm:flex">
        <SearchIcon className="h-4 w-4" />
        Rechercher...
      </div>

      <div className="flex items-center gap-3">
        <Avatar initials="ÉT" />
      </div>
    </header>
  );
}
