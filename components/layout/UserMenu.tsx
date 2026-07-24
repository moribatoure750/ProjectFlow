"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { LogOutIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { getInitials } from "@/lib/initials";
import type { CurrentUserSummary } from "@/lib/supabase/session";
import { signOut } from "@/services/auth.service";

interface UserMenuProps {
  user: CurrentUserSummary;
}

/**
 * Menu utilisateur du Header (Lot 6) : avatar déclencheur + panneau
 * (nom/email, action de déconnexion). Reçoit `user` déjà résolu par le
 * layout serveur `(app)` (`getCurrentUserSummary()`) — aucun appel
 * Supabase supplémentaire ici, uniquement `signOut()` au clic.
 *
 * Accessibilité : `role="menu"`/`menuitem`, `aria-haspopup`/
 * `aria-expanded`, focus déplacé sur le premier item à l'ouverture et
 * restitué au bouton déclencheur à la fermeture (clic extérieur, Escape,
 * ou fin d'action). Fermeture au clic extérieur et à Escape déléguée à
 * `useOnClickOutside` (même pattern que `Modal.tsx`).
 */
export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = getInitials(user.displayName, user.email);
  const label = user.displayName || "Utilisateur";

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useOnClickOutside(containerRef, open, closeMenu);

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }
    setError(null);
    setOpen(true);
    // Le panneau vient d'être monté ; on déplace le focus dès le prochain
    // tick pour laisser React attacher la ref avant `.focus()`.
    requestAnimationFrame(() => firstItemRef.current?.focus());
  }

  async function handleSignOut() {
    if (signingOut) return; // anti double-clic

    setSigningOut(true);
    setError(null);

    const { error: signOutError } = await signOut();

    if (signOutError) {
      setSigningOut(false);
      setError("La déconnexion a échoué. Veuillez réessayer.");
      return;
    }

    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu-panel"
        className="flex items-center gap-2 rounded-full transition-opacity duration-150 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Avatar initials={initials} />
      </button>

      {open && (
        <div
          id="user-menu-panel"
          role="menu"
          aria-label="Menu utilisateur"
          className="absolute right-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-1.5 shadow-xl animate-scale-in"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium text-fg">{label}</p>
            <p className="truncate text-xs text-fg-muted">{user.email}</p>
          </div>

          {error && (
            <p role="alert" className="px-3 py-2 text-xs text-danger-600">
              {error}
            </p>
          )}

          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-busy={signingOut || undefined}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {signingOut ? (
              <Spinner size="sm" />
            ) : (
              <LogOutIcon className="h-4 w-4" />
            )}
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
