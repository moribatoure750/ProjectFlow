"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { BellIcon } from "@/components/ui/icons";
import { useNotifications } from "@/hooks/useNotifications";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { NotificationItem } from "./NotificationItem";

/** Nombre de notifications affichées dans l'aperçu du dropdown — la
 *  liste complète reste disponible sur `/notifications`. */
const DROPDOWN_LIMIT = 8;

/**
 * Cloche de notifications du Header — bouton + badge compteur +
 * dropdown d'aperçu (top 8), sur le même pattern que `UserMenu.tsx`
 * (`useOnClickOutside`, fermeture Escape, restitution du focus).
 *
 * Le compteur représente le nombre de notifications actives calculées
 * (pas de notion de "lu/non lu" : aucun stockage persistant).
 *
 * Le panneau n'utilise pas `role="menu"` (qui impliquerait une
 * navigation clavier par flèches non implémentée ici) : c'est un
 * popover accessible standard, avec des liens classiques, fermé par
 * Escape ou clic extérieur, avec restitution du focus au bouton.
 */
export function NotificationBell() {
  const { notifications, loading, hasPartialFailure, refetch } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const count = notifications.length;
  const countLabel = count > 9 ? "9+" : String(count);
  const visibleNotifications = notifications.slice(0, DROPDOWN_LIMIT);

  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useOnClickOutside(containerRef, open, closePanel);

  function togglePanel() {
    if (open) {
      closePanel();
      return;
    }
    setOpen(true);
    refetch();
    requestAnimationFrame(() => panelRef.current?.focus());
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePanel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={
          count > 0
            ? `Notifications, ${count} alerte${count > 1 ? "s" : ""} active${count > 1 ? "s" : ""}`
            : "Notifications, aucune alerte active"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <BellIcon className="h-5 w-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white"
          >
            {countLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          className="animate-scale-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-lg border border-border bg-surface p-1.5 shadow-xl focus:outline-none"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {count > 0 && (
              <span className="text-xs text-fg-subtle">
                {count} alerte{count > 1 ? "s" : ""} active{count > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {hasPartialFailure && (
            <p className="px-3 py-1.5 text-xs text-warning-700">
              Certaines données n&apos;ont pas pu être chargées.
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-4 text-sm text-fg-muted">Chargement...</p>
            ) : visibleNotifications.length === 0 ? (
              <EmptyState
                compact
                title="Tout est sous contrôle 🎉"
                description="Aucune alerte pour le moment."
              />
            ) : (
              visibleNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={closePanel}
                />
              ))
            )}
          </div>

          <div className="mt-1 border-t border-border pt-1">
            <Link
              href="/notifications"
              onClick={closePanel}
              className="block rounded-md px-3 py-2 text-center text-sm font-medium text-accent transition-colors duration-150 hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
