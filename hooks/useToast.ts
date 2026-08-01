"use client";

import { useCallback, useEffect, useState } from "react";
import type { ToastVariant } from "@/components/ui/Toast";

/** Les feedbacks positifs/informatifs se ferment seuls ; une erreur ou un
 * avertissement reste visible tant que l'utilisateur ne le ferme pas
 * manuellement — même convention que `app/(app)/profile/page.tsx`
 * (Lot 9), généralisée ici (Lot 20) pour éviter de dupliquer cette
 * logique dans chaque page qui remplace `alert()` par `Toast`. */
const AUTO_DISMISS_MS = 5000;

export interface ToastState {
  variant: ToastVariant;
  message: string;
}

/**
 * useToast — état de feedback "page-level" partagé par les pages
 * Projets/Tâches/Réunions (listes et détail) : un seul message affiché
 * à la fois, auto-dismiss sur succès/info, persistant sur erreur/
 * avertissement jusqu'à fermeture manuelle. Ne rend rien lui-même —
 * l'appelant reste responsable du rendu via `<Toast variant=... />`
 * (voir EmptyState/Toast, composants purement présentation).
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast || toast.variant === "error" || toast.variant === "warning") {
      return;
    }
    const timer = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((variant: ToastVariant, message: string) => {
    setToast({ variant, message });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}
