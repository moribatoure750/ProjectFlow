"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/search/CommandPalette";
import type { CurrentUserSummary } from "@/lib/supabase/session";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
  user: CurrentUserSummary;
}

export function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  /** Élément ayant le focus juste avant l'ouverture de la palette — la
   *  fermeture (Escape/clic extérieur/sélection) lui restitue le
   *  focus, même pattern que `NotificationBell`/`UserMenu`. Suivi via
   *  un ref (jamais un état) : il n'affecte aucun rendu. */
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const searchOpenRef = useRef(searchOpen);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  const openSearch = useCallback(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    lastFocusedRef.current?.focus();
  }, []);

  // Raccourci global Ctrl/Cmd+K — écouté au niveau document pour
  // fonctionner depuis n'importe quelle page. Lorsque la palette est
  // fermée et que le focus est déjà dans un champ éditable
  // (input/textarea/contenteditable), le raccourci est ignoré pour ne
  // pas interrompre une saisie en cours ; une fois la palette ouverte,
  // Ctrl/Cmd+K referme toujours (son propre champ de recherche est lui
  // aussi un <input>, donc ce cas doit rester prioritaire).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isCtrlK) return;

      if (searchOpenRef.current) {
        event.preventDefault();
        closeSearch();
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditable) return;

      event.preventDefault();
      openSearch();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openSearch, closeSearch]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          onOpenSearch={openSearch}
          user={user}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {/* Toujours monté (même fermé) pour que `useGlobalSearch` garde
       *  ses données en cache tant que l'AppShell reste monté — voir
       *  CommandPalette.tsx. */}
      <CommandPalette open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
