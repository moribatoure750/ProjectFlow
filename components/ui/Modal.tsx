"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";

/**
 * Modal — accessible dialog used for forms (create/edit) and confirmations.
 *
 * Props:
 *  - `variant` : `default` for regular forms, `danger` for destructive
 *    confirmations (delete). A single component is kept (instead of a
 *    separate `Dialog`) to avoid duplicating the overlay/focus/ESC logic.
 *
 * Behavior:
 *  - Closes on ESC and on backdrop click.
 *  - Fades/scales in on open (`animate-fade-in` / `animate-scale-in`).
 */
export type ModalVariant = "default" | "danger";

/** Largeur maximale du dialogue. `md` (défaut) reste identique au
 *  comportement historique (`max-w-lg`) ; `lg`/`xl` sont utilisées par
 *  les contenus plus riches (ex. `AttachmentPreviewModal`, Lot 15.5). */
export type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: ModalVariant;
  size?: ModalSize;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "default",
  size = "md",
}: ModalProps) {

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col rounded-xl border border-border bg-surface shadow-xl animate-scale-in",
          sizeClasses[size]
        )}
      >

        <div
          className={cn(
            "flex items-center justify-between border-b border-border px-6 py-4",
            variant === "danger" && "text-danger-600"
          )}
        >
          <h2 id="modal-title" className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
            aria-label="Fermer"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
