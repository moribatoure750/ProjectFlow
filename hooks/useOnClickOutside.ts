import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Ferme un panneau (menu, popover) au clic à l'extérieur de `ref`, ou à
 * la touche Escape. Utilisé par `UserMenu` (Lot 6) ; suit le même
 * pattern que la gestion d'Escape déjà présente dans `Modal.tsx`
 * (listener attaché uniquement quand `enabled` est vrai, retiré au
 * démontage/à la fermeture).
 *
 * Générique et sans dépendance externe : pourra être réutilisé par tout
 * futur composant de menu déroulant du Design System.
 */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOutside();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, enabled, onOutside]);
}
