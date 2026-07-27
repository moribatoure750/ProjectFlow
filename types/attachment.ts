/**
 * Pièces jointes privées (Lot 13A), associées à exactement une entité
 * parmi projects/tasks/meetings (voir supabase/attachments.sql pour les
 * contraintes SQL qui garantissent cette exclusivité côté base).
 *
 * Ce fichier ne contient que le modèle de données ; aucune UI ni hook
 * ne consomme encore ce type — voir services/attachments.service.ts
 * pour l'API prévue, et le Lot 13B pour l'intégration UI.
 */

/** Les 3 seules entités pouvant porter des pièces jointes dans ce lot. */
export type AttachmentEntityType = "project" | "task" | "meeting";

/**
 * Représentation applicative d'une ligne `attachments`, indépendante
 * du nom des colonnes SQL (`project_id`/`task_id`/`meeting_id` sont
 * fusionnées en un couple `entityType`/`entityId` unique — voir
 * `services/attachments.service.ts` pour la traduction dans les deux
 * sens).
 */
export interface Attachment {
  id: string;
  userId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  /** Chemin complet dans le bucket Storage `attachments` (jamais basé
   *  sur le nom original du fichier — voir point 6 du plan Lot 13A). */
  storagePath: string;
  /** Nom original choisi par l'utilisateur au moment de l'upload,
   *  affiché dans l'UI mais jamais utilisé comme chemin Storage. */
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** 10 Mo — cohérent avec la contrainte `attachments_size_check` et la
 *  configuration `file_size_limit` du bucket Storage (défense en
 *  profondeur : voir supabase/attachments.sql). */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Même limite, exprimée en Mo pour l'affichage dans l'UI (Lot 13B) —
 *  évite de recalculer/re-écrire cette valeur ailleurs dans le code. */
export const MAX_ATTACHMENT_SIZE_MB = 10;

/**
 * Liste blanche des types MIME acceptés à l'upload. Référence unique
 * côté application : la configuration `allowed_mime_types` du bucket
 * Storage (supabase/attachments.sql) duplique volontairement cette
 * liste comme deuxième ligne de défense, mais c'est bien CETTE
 * constante qui doit être mise à jour en premier si la liste évolue.
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

/** Erreur de validation retournée par `validateAttachmentFile()`
 *  (services/attachments.service.ts) — vérification pure, avant tout
 *  appel réseau. */
export interface AttachmentValidationError {
  code: "file_too_large" | "unsupported_type";
  message: string;
}
