"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import {
  BellIcon,
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
  { href: "/meetings", label: "Réunions", icon: UsersIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
];


const comingSoonItems = [
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
            className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-fg-muted hover:bg-surface-hover hover:text-fg"
            }`}
          >
            <ItemIcon
              className={`h-5 w-5 ${
                active
                  ? "text-accent-foreground"
                  : "text-fg-subtle group-hover:text-fg-muted"
              }`}
            />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          À venir
        </p>
        {comingSoonItems.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-fg-subtle"
            >
              <span className="flex items-center gap-3">
                <ItemIcon className="h-5 w-5 text-fg-subtle" />
                {item.label}
              </span>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
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
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo variant="compact" />
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-900/40 animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-72 flex-col bg-surface shadow-xl animate-slide-down">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
              <Logo variant="compact" />
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover"
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
