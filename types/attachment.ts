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

/** Référence unique de la limite de taille, exprimée en Mo — c'est
 *  cette constante qu'il faut modifier en premier si la limite change,
 *  `MAX_ATTACHMENT_SIZE_BYTES` en est directement dérivée pour éviter
 *  toute divergence entre les deux valeurs. */
export const MAX_ATTACHMENT_SIZE_MB = 10;

/** Cohérent avec la contrainte `attachments_size_check` et la
 *  configuration `file_size_limit` du bucket Storage (défense en
 *  profondeur : voir supabase/attachments.sql). Dérivée de
 *  `MAX_ATTACHMENT_SIZE_MB`, ne jamais redéfinir indépendamment. */
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

/**
 * Liste blanche des types MIME acceptés à l'upload. Référence unique
 * côté application : la contrainte SQL `attachments_mime_type_check`
 * et la configuration `allowed_mime_types` du bucket Storage
 * (supabase/attachments.sql) dupliquent volontairement cette liste
 * comme lignes de défense supplémentaires, mais c'est bien CETTE
 * constante qui doit être mise à jour en premier si la liste évolue —
 * voir aussi `ATTACHMENT_EXTENSION_BY_MIME` ci-dessous, qui doit rester
 * en cohérence exacte (même ensemble de clés).
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

/**
 * Extension canonique à utiliser dans le chemin Storage, dérivée du
 * type MIME *validé* — jamais de l'extension présente dans le nom de
 * fichier original (qui pourrait être trompeuse, ex. un fichier nommé
 * "document.exe" mais dont le contenu déclaré est un PDF). Le nom
 * original reste stocké uniquement dans la colonne `file_name`.
 *
 * Important : `file.type` (utilisé pour déterminer le MIME) est une
 * déclaration fournie par le navigateur/l'OS à partir de l'extension
 * ou de heuristiques simples — ce n'est PAS une inspection réelle du
 * contenu du fichier. Cette table ne constitue donc pas une validation
 * cryptographique ni une garantie que le contenu correspond réellement
 * au type déclaré ; elle garantit uniquement la cohérence entre le
 * MIME déclaré (et validé contre la liste blanche) et l'extension du
 * chemin Storage.
 *
 * `satisfies Record<...>` garantit à la compilation que cette table
 * couvre exactement les mêmes clés que `AllowedAttachmentMimeType`.
 */
export const ATTACHMENT_EXTENSION_BY_MIME = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
} satisfies Record<AllowedAttachmentMimeType, string>;

/** Erreur de validation retournée par `validateAttachmentFile()`
 *  (services/attachments.service.ts) — vérification pure, avant tout
 *  appel réseau. */
export interface AttachmentValidationError {
  code: "file_empty" | "file_too_large" | "unsupported_type";
  message: string;
}
