"use client";

import { usePathname } from "next/navigation";
import { MenuIcon, SearchIcon } from "@/components/ui/icons";

const titles: Record<string, string> = {
  "/": "Accueil",
  "/projects": "Projets",
  "/tasks": "Tâches",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Gestion Projets";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="font-medium text-slate-900">{title}</span>
      </div>

      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 sm:flex">
        <SearchIcon className="h-4 w-4" />
        Rechercher...
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
          ÉT
        </div>
      </div>
    </header>
  );
}
