import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, EyeIcon, TrashIcon } from "@/components/ui/icons";
import { getAttachmentIconMeta, isPreviewableImage, isPreviewablePdf } from "@/lib/attachment-icons";
import { formatDate, formatFileSize } from "@/lib/format";
import { dangerGhostClasses } from "@/lib/utils";
import type { Attachment } from "@/types/attachment";

export interface AttachmentItemProps {
  attachment: Attachment;
  onPreview: () => void;
  onDownload: () => void;
  onDeleteRequest: () => void;
}

/**
 * AttachmentItem — une ligne de la liste des pièces jointes (Lot 15,
 * enrichie en 15.5 : icône typée par catégorie de fichier + action
 * "Aperçu" pour les images/PDF).
 *
 * `flex-col` sur mobile / `flex-row` à partir de `sm:` : mêmes cartes
 * compactes que les lignes tâches/réunions des pages de détail
 * existantes (voir app/(app)/projects/[id]/page.tsx), pas un nouveau
 * pattern de mise en page.
 */
export function AttachmentItem({
  attachment,
  onPreview,
  onDownload,
  onDeleteRequest,
}: AttachmentItemProps) {
  const { Icon, label, tone } = getAttachmentIconMeta(attachment.mimeType);
  const canPreview = isPreviewableImage(attachment.mimeType) || isPreviewablePdf(attachment.mimeType);

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-hover text-fg-subtle">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg" title={attachment.fileName}>
            {attachment.fileName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
            <Badge tone={tone} className="px-1.5 py-0.5">
              {label}
            </Badge>
            <span>
              {formatFileSize(attachment.sizeBytes)} · {formatDate(attachment.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
        {canPreview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<EyeIcon className="h-3.5 w-3.5" />}
            onClick={onPreview}
            aria-label={`Aperçu de ${attachment.fileName}`}
          >
            Aperçu
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<DownloadIcon className="h-3.5 w-3.5" />}
          onClick={onDownload}
          aria-label={`Télécharger ${attachment.fileName}`}
        >
          Télécharger
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<TrashIcon className="h-3.5 w-3.5" />}
          onClick={onDeleteRequest}
          className={dangerGhostClasses}
          aria-label={`Supprimer ${attachment.fileName}`}
        >
          Supprimer
        </Button>
      </div>
    </li>
  );
}
