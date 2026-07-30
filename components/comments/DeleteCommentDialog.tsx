import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Comment } from "@/types/comment";

export interface DeleteCommentDialogProps {
  comment: Comment | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * DeleteCommentDialog — confirmation de suppression d'un commentaire
 * (Lot 17A). Même structure `Modal` `variant="danger"` que les
 * dialogues de suppression existants (voir
 * components/attachments/DeleteAttachmentDialog.tsx), pilotée ici par
 * `comment` (`null` = fermé) plutôt qu'un booléen séparé.
 *
 * La suppression est définitive — aucune corbeille/soft-delete dans
 * ce lot (cohérent avec `comments_delete_own`, supabase/comments.sql,
 * qui exécute un `DELETE` réel).
 */
export function DeleteCommentDialog({
  comment,
  submitting,
  onCancel,
  onConfirm,
}: DeleteCommentDialogProps) {
  return (
    <Modal
      open={comment !== null}
      onClose={onCancel}
      title="Supprimer le commentaire"
      variant="danger"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={submitting}>
            Supprimer
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        Voulez-vous vraiment supprimer ce commentaire ? Cette action est
        irréversible.
      </p>
    </Modal>
  );
}
