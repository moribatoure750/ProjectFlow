"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { useComments } from "@/hooks/useComments";
import { getProfile } from "@/services/profile.service";
import type { Comment, CommentEntityType } from "@/types/comment";

import type { CommentAuthor } from "./CommentItem";
import { CommentEditor } from "./CommentEditor";
import { CommentList } from "./CommentList";
import { CommentsSkeleton } from "./CommentsSkeleton";
import { DeleteCommentDialog } from "./DeleteCommentDialog";

export interface CommentsSectionProps {
  entityType: CommentEntityType;
  entityId: string;
}

/** Repli tant que `getProfile()` n'a pas encore résolu — n'est
 *  affiché qu'un très bref instant, le temps du premier rendu. */
const FALLBACK_AUTHOR: CommentAuthor = { displayName: null, email: "" };

/**
 * CommentsSection — contenu complet de l'onglet "Commentaires"
 * (Lot 17A), unique point d'intégration attendu dans les 3 pages de
 * détail (`/projects/[id]`, `/tasks/[id]`, `/meetings/[id]`) — même
 * rôle qu'`AttachmentSection`/`ActivitySection` pour leurs onglets
 * respectifs.
 *
 * Toute la logique de chargement/mutation reste dans `useComments()` ;
 * ce composant assemble les sous-composants et gère l'état local du
 * compositeur (création) et du dialogue de suppression. L'auteur
 * affiché (avatar/nom) est résolu une seule fois via `getProfile()` —
 * voir la documentation de `CommentAuthor` (CommentItem.tsx) pour le
 * choix de préparer l'interface à un futur mode multi-utilisateur
 * sans le construire dans ce lot.
 *
 * Aucune activité n'est journalisée par ce composant (Lot 17B) : ni
 * `logActivity()` ni aucun import de services/activity.service.ts.
 */
export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const { comments, loading, error, create, update, remove } = useComments(entityType, entityId);

  const [author, setAuthor] = useState<CommentAuthor>(FALLBACK_AUTHOR);

  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAuthor() {
      const { data } = await getProfile();
      if (active && data) {
        setAuthor({ displayName: data.displayName, email: data.email });
      }
    }

    loadAuthor();
    return () => {
      active = false;
    };
  }, []);

  function openComposer() {
    setSubmitError(null);
    setComposerOpen(true);
  }

  function cancelComposer() {
    if (submitting) return;
    setDraft("");
    setSubmitError(null);
    setComposerOpen(false);
  }

  async function handleCreate() {
    if (!draft.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    const result = await create(draft.trim());
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    setDraft("");
    setComposerOpen(false);
  }

  async function handleUpdate(id: string, content: string): Promise<boolean> {
    const result = await update(id, content);
    return result.ok;
  }

  function requestDelete(comment: Comment) {
    setDeleteError(null);
    setPendingDelete(comment);
  }

  function cancelDelete() {
    if (deleteSubmitting) return;
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleteSubmitting(true);
    const result = await remove(pendingDelete.id);
    setDeleteSubmitting(false);

    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    setPendingDelete(null);
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Commentaires</h2>
        {!composerOpen && comments.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={openComposer}
            aria-label="Écrire un commentaire"
          >
            Écrire un commentaire
          </Button>
        )}
      </div>

      {composerOpen && (
        <div className="rounded-lg border border-border bg-surface-muted p-3">
          {submitError && (
            <div className="mb-2">
              <Toast variant="error">{submitError}</Toast>
            </div>
          )}
          <CommentEditor
            value={draft}
            onChange={setDraft}
            onSubmit={handleCreate}
            onCancel={cancelComposer}
            submitting={submitting}
            submitLabel="Publier"
            autoFocus
          />
        </div>
      )}

      {deleteError && <Toast variant="error">{deleteError}</Toast>}

      {loading ? (
        <CommentsSkeleton />
      ) : error ? (
        <Toast variant="error">{error}</Toast>
      ) : (
        <CommentList
          comments={comments}
          author={author}
          composerOpen={composerOpen}
          onUpdate={handleUpdate}
          onDeleteRequest={requestDelete}
          onComposeRequest={openComposer}
        />
      )}

      <DeleteCommentDialog
        comment={pendingDelete}
        submitting={deleteSubmitting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
