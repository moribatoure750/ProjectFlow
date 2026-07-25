"use client";

import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Toast — bannière de retour (succès/erreur/avertissement/info).
 *
 * Lot 9 : composant volontairement présentation pur — pas de
 * `ToastProvider`/Context global, pas d'empilement, pas de portail.
 * L'appelant décide où et quand l'afficher (ex: dans le formulaire de
 * la page Profil) et gère lui-même une éventuelle fermeture
 * automatique — voir `app/(app)/profile/page.tsx` pour un exemple
 * (auto-dismiss sur succès/info, persistant sur erreur/warning tant
 * que l'utilisateur ne ferme pas manuellement).
 *
 * Accessibilité :
 *  - `role="alert"` pour la variante `error` (annoncé immédiatement) ;
 *  - `role="status"` + `aria-live="polite"` pour les autres variantes.
 */
export type ToastVariant = "success" | "error" | "warning" | "info";

const variants: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; classes: string }
> = {
  success: {
    icon: CheckCircle2,
    classes:
      "border-success-600/30 bg-success-50 text-success-700 dark:bg-success-100/10 dark:text-success-600",
  },
  error: {
    icon: AlertCircle,
    classes:
      "border-danger-600/30 bg-danger-50 text-danger-600 dark:bg-danger-100/10 dark:text-danger-600",
  },
  warning: {
    icon: TriangleAlert,
    classes:
      "border-warning-600/30 bg-warning-50 text-warning-700 dark:bg-warning-100/10 dark:text-warning-600",
  },
  info: {
    icon: Info,
    classes:
      "border-info-600/30 bg-info-50 text-info-700 dark:bg-info-100/10 dark:text-info-600",
  },
};

export interface ToastProps {
  variant: ToastVariant;
  children: ReactNode;
  /** Affiche un bouton de fermeture manuelle lorsque fourni. */
  onClose?: () => void;
  className?: string;
}

export function Toast({ variant, children, onClose, className }: ToastProps) {
  const { icon: Icon, classes } = variants[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm animate-fade-in",
        classes,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{children}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity duration-150 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
