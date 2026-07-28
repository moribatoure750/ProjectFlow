"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteAttachment,
  getSignedAttachmentUrl,
  listAttachments,
  uploadAttachment,
  validateAttachmentFile,
} from "@/services/attachments.service";
import type { Attachment, AttachmentEntityType } from "@/types/attachment";

/**
 * Résultat uniforme retourné par `remove`/`download`/`preview` : le
 * composant appelant (components/attachments/AttachmentSection.tsx)
 * décide lui-même comment afficher `error` (Toast, message inline…),
 * ce hook ne porte aucun état d'erreur "par action" pour rester simple.
 */
export interface AttachmentActionResult {
  ok: boolean;
  error: string | null;
}

export interface AttachmentPreviewResult {
  ok: boolean;
  url: string | null;
  error: string | null;
}

export type UploadQueueItemStatus = "uploading" | "success" | "error";

/**
 * Un élément de la file d'upload en cours (Lot 15.5) — purement
 * transitoire côté client : jamais persisté, sert uniquement à
 * afficher une progression par fichier lors d'un envoi multiple
 * (`uploadFiles`). Retiré automatiquement de la file après un délai
 * une fois `status !== "uploading"`, ou manuellement via
 * `dismissQueueItem`.
 */
export interface UploadQueueItem {
  id: string;
  fileName: string;
  status: UploadQueueItemStatus;
  error: string | null;
}

export interface UseAttachmentsResult {
  attachments: Attachment[];
  /** `true` uniquement avant la fin du tout premier chargement — un
   *  upload/suppression déclenche un `refresh()` silencieux (la liste
   *  actuelle reste affichée pendant le rechargement), même choix que
   *  `hooks/useDashboardAnalytics.ts`. */
  loading: boolean;
  /** Erreur de chargement de la liste — distincte des erreurs
   *  d'upload/suppression/téléchargement, retournées directement par
   *  chaque action. */
  error: string | null;
  /** File d'upload en cours (Lot 15.5) : un élément par fichier d'un
   *  éventuel envoi multiple, affiché par `AttachmentUploader`. */
  uploadQueue: UploadQueueItem[];
  uploading: boolean;
  refresh: () => Promise<void>;
  /** Envoie un ou plusieurs fichiers, séquentiellement (pour rester
   *  dans les limites du bucket/API sans surcharger le réseau), en
   *  mettant à jour `uploadQueue` au fur et à mesure. Les fichiers
   *  invalides (voir `validateAttachmentFile`) sont marqués en erreur
   *  dans la file sans bloquer l'envoi des autres. */
  uploadFiles: (files: File[]) => Promise<void>;
  dismissQueueItem: (id: string) => void;
  remove: (id: string) => Promise<AttachmentActionResult>;
  download: (attachment: Attachment) => Promise<AttachmentActionResult>;
  /** Résout une URL signée pour aperçu inline (image/PDF), sans
   *  ouvrir de nouvel onglet — voir `AttachmentPreviewModal`. */
  preview: (attachment: Attachment) => Promise<AttachmentPreviewResult>;
}

/** Délai avant retrait automatique d'un élément terminé de la file
 *  d'upload (succès ou erreur), pour laisser le temps à l'utilisateur
 *  de voir le résultat sans devoir cliquer pour le fermer. */
const QUEUE_ITEM_AUTO_DISMISS_MS = 4000;

/**
 * useAttachments — unique point d'accès UI au Lot 13A
 * (services/attachments.service.ts) pour les 3 entités pouvant porter
 * des pièces jointes (project/task/meeting). Aucun composant ne doit
 * appeler ce service directement ni contourner ce hook.
 *
 * Volontairement sans Provider/Context : chaque page de détail
 * instancie ce hook avec son propre `entityType`/`entityId`, comme les
 * autres hooks de lecture de ce projet (ex. hooks/useNotifications.ts,
 * dont le pattern `isFetchingRef` est repris ici à l'identique).
 */
export function useAttachments(
  entityType: AttachmentEntityType,
  entityId: string
): UseAttachmentsResult {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const isFetchingRef = useRef(false);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error: listError } = await listAttachments(entityType, entityId);
      setAttachments(data);
      setError(listError?.message ?? null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scheduleAutoDismiss = useCallback((id: string) => {
    const timer = setTimeout(() => {
      setUploadQueue((queue) => queue.filter((item) => item.id !== id));
      dismissTimersRef.current.delete(id);
    }, QUEUE_ITEM_AUTO_DISMISS_MS);
    dismissTimersRef.current.set(id, timer);
  }, []);

  const dismissQueueItem = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
    setUploadQueue((queue) => queue.filter((item) => item.id !== id));
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const queueItems: UploadQueueItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        status: "uploading",
        error: null,
      }));
      setUploadQueue((queue) => [...queue, ...queueItems]);

      // Envoi séquentiel (pas de Promise.all) : évite de saturer le
      // bucket/API si plusieurs fichiers volumineux sont déposés en
      // même temps, et garde un ordre de progression prévisible dans
      // la file affichée à l'utilisateur.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const queueId = queueItems[i].id;

        const validationError = validateAttachmentFile(file);
        if (validationError) {
          setUploadQueue((queue) =>
            queue.map((item) =>
              item.id === queueId
                ? { ...item, status: "error", error: validationError.message }
                : item
            )
          );
          scheduleAutoDismiss(queueId);
          continue;
        }

        const { error: uploadError } = await uploadAttachment(entityType, entityId, file);

        if (uploadError) {
          setUploadQueue((queue) =>
            queue.map((item) =>
              item.id === queueId
                ? { ...item, status: "error", error: uploadError.message }
                : item
            )
          );
        } else {
          setUploadQueue((queue) =>
            queue.map((item) => (item.id === queueId ? { ...item, status: "success" } : item))
          );
        }
        scheduleAutoDismiss(queueId);
      }

      await refresh();
    },
    [entityType, entityId, refresh, scheduleAutoDismiss]
  );

  const remove = useCallback(
    async (id: string): Promise<AttachmentActionResult> => {
      const { error: deleteError } = await deleteAttachment(id);
      if (deleteError) {
        return { ok: false, error: deleteError.message };
      }

      await refresh();
      return { ok: true, error: null };
    },
    [refresh]
  );

  const download = useCallback(
    async (attachment: Attachment): Promise<AttachmentActionResult> => {
      const { url, error: urlError } = await getSignedAttachmentUrl(attachment.id);
      if (urlError || !url) {
        return {
          ok: false,
          error: urlError?.message ?? "Impossible de générer le lien de téléchargement.",
        };
      }

      // Jamais d'accès direct au chemin Storage : uniquement cette URL
      // signée à courte durée de vie (voir getSignedAttachmentUrl,
      // services/attachments.service.ts).
      window.open(url, "_blank", "noopener,noreferrer");
      return { ok: true, error: null };
    },
    []
  );

  const preview = useCallback(
    async (attachment: Attachment): Promise<AttachmentPreviewResult> => {
      const { url, error: urlError } = await getSignedAttachmentUrl(attachment.id);
      if (urlError || !url) {
        return {
          ok: false,
          url: null,
          error: urlError?.message ?? "Impossible de générer l'aperçu.",
        };
      }
      return { ok: true, url, error: null };
    },
    []
  );

  const uploading = uploadQueue.some((item) => item.status === "uploading");

  return {
    attachments,
    loading,
    error,
    uploadQueue,
    uploading,
    refresh,
    uploadFiles,
    dismissQueueItem,
    remove,
    download,
    preview,
  };
}
