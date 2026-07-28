"use client";

import { type ChangeEvent, type DragEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CheckSquareIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { MAX_ATTACHMENT_SIZE_MB } from "@/types/attachment";
import type { UploadQueueItem } from "@/hooks/useAttachments";

export interface AttachmentUploaderProps {
  uploading: boolean;
  uploadQueue: UploadQueueItem[];
  onDismissQueueItem: (id: string) => void;
  onUpload: (files: File[]) => Promise<void>;
}

/**
 * AttachmentUploader — zone d'ajout de fichiers de l'onglet Pièces
 * jointes (Lot 15.5) : bouton "Ajouter des fichiers" **et** zone de
 * dépôt drag & drop couvrant toute la largeur, acceptant plusieurs
 * fichiers à la fois. Le `<input type="file" multiple>` réel reste
 * caché (`tabIndex={-1}`) : c'est le `Button` visible qui porte le
 * focus/aria-label, cohérent avec le reste du Design System
 * (components/ui/Button.tsx).
 *
 * Aucun accès direct à Supabase Storage ici : `onUpload` délègue
 * entièrement à `useAttachments()` (hooks/useAttachments.ts), qui
 * passe par services/attachments.service.ts. La progression par
 * fichier (`uploadQueue`) est affichée sous forme de mini-liste,
 * chaque ligne se retirant automatiquement après quelques secondes ou
 * manuellement via `onDismissQueueItem`.
 */
export function AttachmentUploader({
  uploading,
  uploadQueue,
  onDismissQueueItem,
  onUpload,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handlePick() {
    inputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset immédiat : permet de re-sélectionner les mêmes fichiers
    // après une erreur, sinon le navigateur ne redéclenche pas `onChange`.
    event.target.value = "";
    if (files.length === 0) return;
    await onUpload(files);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    await onUpload(files);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors duration-150",
          isDragOver ? "border-accent bg-accent-soft/40" : "border-border bg-surface-muted"
        )}
      >
        <UploadIcon className="h-6 w-6 text-fg-subtle" />
        <p className="text-sm text-fg-muted">
          Glissez-déposez vos fichiers ici, ou
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={uploading}
          onClick={handlePick}
          aria-label="Ajouter des fichiers"
        >
          Choisir des fichiers
        </Button>
        <p className="text-xs text-fg-subtle">
          Taille maximale : {MAX_ATTACHMENT_SIZE_MB} Mo par fichier.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {uploadQueue.length > 0 && (
        <ul className="space-y-1.5">
          {uploadQueue.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
                item.status === "error"
                  ? "border-danger-600/30 bg-danger-50 text-danger-600 dark:bg-danger-100/10"
                  : item.status === "success"
                    ? "border-success-600/30 bg-success-50 text-success-700 dark:bg-success-100/10 dark:text-success-600"
                    : "border-border bg-surface-muted text-fg-muted"
              )}
            >
              {item.status === "uploading" && (
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {item.status === "success" && (
                <CheckSquareIcon className="h-3.5 w-3.5 shrink-0" />
              )}
              {item.status === "error" && <XIcon className="h-3.5 w-3.5 shrink-0" />}

              <span className="min-w-0 flex-1 truncate" title={item.fileName}>
                {item.fileName}
                {item.status === "error" && item.error ? ` — ${item.error}` : ""}
              </span>

              {item.status !== "uploading" && (
                <button
                  type="button"
                  onClick={() => onDismissQueueItem(item.id)}
                  className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity duration-150 hover:opacity-100"
                  aria-label="Fermer"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
