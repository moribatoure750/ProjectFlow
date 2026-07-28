"use client";

import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { DownloadIcon } from "@/components/ui/icons";
import { isPreviewableImage } from "@/lib/attachment-icons";
import type { Attachment } from "@/types/attachment";

export interface AttachmentPreviewModalProps {
  attachment: Attachment | null;
  url: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: () => void;
}

/**
 * AttachmentPreviewModal — aperçu inline d'une image ou d'un PDF
 * (Lot 15.5), déclenché par le bouton "Aperçu" de `AttachmentItem`.
 * Pilotée par `attachment` (`null` = fermée), même convention que
 * `DeleteAttachmentDialog`.
 *
 * L'URL signée (`url`) est résolue à la demande par
 * `useAttachments().preview()` — jamais pré-générée ni mise en cache,
 * cohérent avec `getSignedAttachmentUrl` (services/attachments.service.ts).
 * Cette modale ne fait aucun appel réseau elle-même.
 */
export function AttachmentPreviewModal({
  attachment,
  url,
  loading,
  error,
  onClose,
  onDownload,
}: AttachmentPreviewModalProps) {
  const isImage = attachment ? isPreviewableImage(attachment.mimeType) : false;

  return (
    <Modal
      open={attachment !== null}
      onClose={onClose}
      title={attachment?.fileName ?? "Aperçu"}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="primary"
            icon={<DownloadIcon className="h-3.5 w-3.5" />}
            onClick={onDownload}
          >
            Télécharger
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingSkeleton className="h-[60vh] w-full" />
      ) : error ? (
        <Toast variant="error">{error}</Toast>
      ) : url && attachment ? (
        isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, jamais optimisable/mise en cache par next/image.
          <img
            src={url}
            alt={attachment.fileName}
            className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
          />
        ) : (
          <iframe
            src={url}
            title={attachment.fileName}
            className="h-[70vh] w-full rounded-md border border-border"
          />
        )
      ) : null}
    </Modal>
  );
}
