"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItems,
  moveChecklistItem,
  toggleChecklistItemCompleted,
  updateChecklistItemContent,
} from "@/services/checklist.service";
import type { ChecklistItem, ChecklistMoveDirection } from "@/types/checklist";

/**
 * Résultat uniforme retourné par `create`/`update`/`toggle`/`remove`/
 * `move` — le composant appelant (components/checklist/ChecklistSection.tsx)
 * décide lui-même comment afficher `error` (Toast inline…), même
 * pattern que `CommentActionResult` (hooks/useComments.ts).
 */
export interface ChecklistActionResult {
  ok: boolean;
  error: string | null;
}

export interface UseChecklistResult {
  items: ChecklistItem[];
  /** `true` uniquement avant la fin du tout premier chargement — même
   *  choix que `hooks/useComments.ts`/`hooks/useAttachments.ts`. */
  loading: boolean;
  error: string | null;
  /** Nombre d'éléments cochés parmi `items`. */
  completedCount: number;
  /** Nombre total d'éléments de la checklist. */
  totalCount: number;
  /** Pourcentage d'éléments cochés, arrondi à l'entier — `0` si la
   *  checklist est vide (pas de division par zéro). */
  percent: number;
  refresh: () => Promise<void>;
  create: (content: string) => Promise<ChecklistActionResult>;
  update: (id: string, content: string) => Promise<ChecklistActionResult>;
  toggle: (id: string, completed: boolean) => Promise<ChecklistActionResult>;
  remove: (id: string) => Promise<ChecklistActionResult>;
  move: (id: string, direction: ChecklistMoveDirection) => Promise<ChecklistActionResult>;
}

/**
 * useChecklist — unique point d'accès UI au Lot 18
 * (services/checklist.service.ts). Purement un hook d'orchestration :
 * aucune logique métier ici (validation du contenu, calcul des
 * positions — laissés au service), uniquement
 * chargement/mutation/rafraîchissement, exposition de
 * `loading`/`error` et dérivation de la progression
 * (`completedCount`/`totalCount`/`percent`).
 *
 * Volontairement sans Provider/Context, comme `useComments()` /
 * `useAttachments()` : `components/checklist/ChecklistSection.tsx`
 * instancie ce hook avec le seul `taskId` de la page de détail.
 *
 * `move()` transmet la liste `items` actuellement en mémoire au
 * service (`moveChecklistItem`), qui l'utilise pour retrouver le
 * voisin immédiat sans requête de relecture supplémentaire — voir
 * services/checklist.service.ts.
 */
export function useChecklist(taskId: string): UseChecklistResult {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error: fetchError } = await getChecklistItems(taskId);
      setItems(data);
      setError(fetchError?.message ?? null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (content: string): Promise<ChecklistActionResult> => {
      const { error: createError } = await createChecklistItem({ taskId, content });
      if (createError) {
        return { ok: false, error: createError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [taskId, refresh]
  );

  const update = useCallback(
    async (id: string, content: string): Promise<ChecklistActionResult> => {
      const { error: updateError } = await updateChecklistItemContent(id, { content });
      if (updateError) {
        return { ok: false, error: updateError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const toggle = useCallback(
    async (id: string, completed: boolean): Promise<ChecklistActionResult> => {
      const { error: toggleError } = await toggleChecklistItemCompleted(id, completed);
      if (toggleError) {
        return { ok: false, error: toggleError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<ChecklistActionResult> => {
      const { error: deleteError } = await deleteChecklistItem(id);
      if (deleteError) {
        return { ok: false, error: deleteError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const move = useCallback(
    async (id: string, direction: ChecklistMoveDirection): Promise<ChecklistActionResult> => {
      const { error: moveError } = await moveChecklistItem(items, id, direction);
      if (moveError) {
        return { ok: false, error: moveError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [items, refresh]
  );

  const { completedCount, totalCount, percent } = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.completed).length;
    return {
      completedCount: completed,
      totalCount: total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [items]);

  return {
    items,
    loading,
    error,
    completedCount,
    totalCount,
    percent,
    refresh,
    create,
    update,
    toggle,
    remove,
    move,
  };
}
