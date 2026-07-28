import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Attachment } from "@/types/attachment";

export interface DeleteAttachmentDialogProps {
  attachment: Attachment | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * DeleteAttachmentDialog — confirmation de suppression d'une pièce
 * jointe (Lot 15). Même structure `Modal` `variant="danger"` que les
 * dialogues de suppression projet/tâche/réunion (voir
 * app/(app)/projects/[id]/page.tsx), pilotée ici par `attachment`
 * (`null` = fermé) plutôt qu'un booléen séparé, puisque le contenu du
 * message dépend directement du fichier ciblé.
 */
export function DeleteAttachmentDialog({
  attachment,
  submitting,
  onCancel,
  onConfirm,
}: DeleteAttachmentDialogProps) {
  return (
    <Modal
      open={attachment !== null}
      onClose={onCancel}
      title="Supprimer la pièce jointe"
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
        Voulez-vous vraiment supprimer{" "}
        <span className="font-semibold text-fg">{attachment?.fileName}</span> ? Cette
        action est irréversible.
      </p>
    </Modal>
  );
}
