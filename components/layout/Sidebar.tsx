"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquareIcon,
  FolderIcon,
  HomeIcon,
  LockIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";

const navItems = [
  { href: "/", label: "Accueil", icon: HomeIcon },
  { href: "/projects", label: "Projets", icon: FolderIcon },
  { href: "/tasks", label: "Tâches", icon: CheckSquareIcon },
];

const comingSoonItems = [
  { label: "Réunions", icon: UsersIcon },
  { label: "Authentification", icon: LockIcon },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ItemIcon
              className={`h-5 w-5 ${
                active
                  ? "text-white"
                  : "text-slate-400 group-hover:text-slate-600"
              }`}
            />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          À venir
        </p>
        {comingSoonItems.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400"
            >
              <span className="flex items-center gap-3">
                <ItemIcon className="h-5 w-5 text-slate-300" />
                {item.label}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                Bientôt
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
          <span className="text-xl">🎓</span>
          <span className="font-semibold text-slate-900">Gestion Projets</span>
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-100 px-5">
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                <span className="text-xl">🎓</span>
                Gestion Projets
              </span>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Fermer le menu"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
