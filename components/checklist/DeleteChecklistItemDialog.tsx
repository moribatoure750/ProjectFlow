import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ChecklistItem } from "@/types/checklist";

export interface DeleteChecklistItemDialogProps {
  item: ChecklistItem | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * DeleteChecklistItemDialog — confirmation avant suppression d'un
 * élément de checklist (Lot 18), même pattern que
 * `DeleteCommentDialog`/`DeleteAttachmentDialog` : `open` dérivé de
 * `item !== null`, pas d'état local dupliqué.
 */
export function DeleteChecklistItemDialog({
  item,
  submitting,
  onCancel,
  onConfirm,
}: DeleteChecklistItemDialogProps) {
  return (
    <Modal
      open={item !== null}
      onClose={onCancel}
      title="Supprimer l'élément"
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
        <span className="font-semibold text-fg">{item?.content}</span> de la
        checklist ? Cette action est irréversible.
      </p>
    </Modal>
  );
}
