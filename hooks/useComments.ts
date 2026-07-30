"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createComment, deleteComment, getComments, updateComment } from "@/services/comments.service";
import type { Comment, CommentEntityType } from "@/types/comment";

/**
 * Résultat uniforme retourné par `create`/`update`/`remove` — le
 * composant appelant (components/comments/CommentsSection.tsx)
 * décide lui-même comment afficher `error` (Toast inline…), même
 * pattern que `AttachmentActionResult` (hooks/useAttachments.ts).
 */
export interface CommentActionResult {
  ok: boolean;
  error: string | null;
}

export interface UseCommentsResult {
  comments: Comment[];
  /** `true` uniquement avant la fin du tout premier chargement — même
   *  choix que `hooks/useActivity.ts`/`hooks/useAttachments.ts`. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (content: string) => Promise<CommentActionResult>;
  update: (id: string, content: string) => Promise<CommentActionResult>;
  remove: (id: string) => Promise<CommentActionResult>;
}

/**
 * useComments — unique point d'accès UI au Lot 17A
 * (services/comments.service.ts). Purement un hook d'orchestration :
 * aucune logique métier ici (validation du contenu, formatage —
 * laissés au service et aux composants), uniquement
 * chargement/mutation/rafraîchissement et exposition de
 * `loading`/`error`.
 *
 * Volontairement sans Provider/Context, comme `useActivity()` /
 * `useAttachments()` : chaque page de détail instancie ce hook avec
 * son propre `entityType`/`entityId`.
 */
export function useComments(
  entityType: CommentEntityType,
  entityId: string
): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error: fetchError } = await getComments(entityType, entityId);
      setComments(data);
      setError(fetchError?.message ?? null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (content: string): Promise<CommentActionResult> => {
      const { error: createError } = await createComment({ entityType, entityId, content });
      if (createError) {
        return { ok: false, error: createError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [entityType, entityId, refresh]
  );

  const update = useCallback(
    async (id: string, content: string): Promise<CommentActionResult> => {
      const { error: updateError } = await updateComment(id, { content });
      if (updateError) {
        return { ok: false, error: updateError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<CommentActionResult> => {
      const { error: deleteError } = await deleteComment(id);
      if (deleteError) {
        return { ok: false, error: deleteError.message };
      }
      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  return { comments, loading, error, refresh, create, update, remove };
}
