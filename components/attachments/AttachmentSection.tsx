"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Toast } from "@/components/ui/Toast";
import { useAttachments } from "@/hooks/useAttachments";
import type { Attachment, AttachmentEntityType } from "@/types/attachment";

import { AttachmentList } from "./AttachmentList";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { AttachmentUploader } from "./AttachmentUploader";
import { DeleteAttachmentDialog } from "./DeleteAttachmentDialog";

export interface AttachmentSectionProps {
  entityType: AttachmentEntityType;
  entityId: string;
}

/**
 * AttachmentSection — contenu complet de l'onglet "Pièces jointes"
 * (Lot 15, enrichi en 15.5 : drag & drop multi-fichiers, icônes
 * typées, recherche/tri, aperçu inline), unique point d'intégration
 * attendu dans les 3 pages de détail (`/projects/[id]`, `/tasks/[id]`,
 * `/meetings/[id]`).
 *
 * Toute la logique (chargement, upload, suppression, téléchargement,
 * aperçu) reste dans `useAttachments()` — ce composant ne fait
 * qu'assembler les sous-composants et gérer l'état local des deux
 * dialogues (suppression, aperçu).
 */
export function AttachmentSection({ entityType, entityId }: AttachmentSectionProps) {
  const {
    attachments,
    loading,
    error,
    uploadQueue,
    uploading,
    uploadFiles,
    dismissQueueItem,
    remove,
    download,
    preview,
  } = useAttachments(entityType, entityId);

  const [pendingDelete, setPendingDelete] = useState<Attachment | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function handleUpload(files: File[]) {
    await uploadFiles(files);
  }

  async function handleDownload(attachment: Attachment) {
    setDownloadError(null);
    const result = await download(attachment);
    if (!result.ok) {
      setDownloadError(result.error);
    }
  }

  async function handlePreviewRequest(attachment: Attachment) {
    setPreviewAttachment(attachment);
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);

    const result = await preview(attachment);
    setPreviewLoading(false);

    if (!result.ok) {
      setPreviewError(result.error);
      return;
    }
    setPreviewUrl(result.url);
  }

  function closePreview() {
    setPreviewAttachment(null);
    setPreviewUrl(null);
    setPreviewError(null);
  }

  async function handlePreviewDownload() {
    if (!previewAttachment) return;
    await handleDownload(previewAttachment);
  }

  function requestDelete(attachment: Attachment) {
    setDeleteError(null);
    setPendingDelete(attachment);
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
      <AttachmentUploader
        uploading={uploading}
        uploadQueue={uploadQueue}
        onDismissQueueItem={dismissQueueItem}
        onUpload={handleUpload}
      />

      {downloadError && <Toast variant="error">{downloadError}</Toast>}
      {deleteError && <Toast variant="error">{deleteError}</Toast>}

      {loading ? (
        <div className="space-y-2">
          <LoadingSkeleton className="h-12 w-full" />
          <LoadingSkeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <Toast variant="error">{error}</Toast>
      ) : (
        <AttachmentList
          attachments={attachments}
          onPreview={handlePreviewRequest}
          onDownload={handleDownload}
          onDeleteRequest={requestDelete}
        />
      )}

      <DeleteAttachmentDialog
        attachment={pendingDelete}
        submitting={deleteSubmitting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      <AttachmentPreviewModal
        attachment={previewAttachment}
        url={previewUrl}
        loading={previewLoading}
        error={previewError}
        onClose={closePreview}
        onDownload={handlePreviewDownload}
      />
    </Card>
  );
}
