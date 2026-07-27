import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";

import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  ATTACHMENT_EXTENSION_BY_MIME,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_MB,
  type AllowedAttachmentMimeType,
  type Attachment,
  type AttachmentEntityType,
  type AttachmentValidationError,
} from "@/types/attachment";

/**
 * Service des pièces jointes privées (Lot 13A — architecture uniquement).
 *
 * Aucun hook ni composant ne consomme encore ce service : voir
 * supabase/attachments.sql pour le schéma/policies correspondants, et
 * le Lot 13B pour l'intégration UI (hooks/useAttachments.ts +
 * composants d'upload/liste/suppression).
 *
 * Même pattern que services/tasks.service.ts et
 * services/meetings.service.ts : un `getRequiredUserId()` en première
 * ligne de chaque opération, jamais de `user_id` fourni par l'appelant.
 *
 * Type d'erreur unifié (voir revue Lot 13A, point 16) : toutes les
 * fonctions de ce service retournent `AttachmentServiceError | null`,
 * qu'il s'agisse d'une erreur de validation, d'une erreur PostgREST ou
 * d'une erreur Storage — le Lot 13B peut donc afficher `error.message`
 * sans connaître la forme interne de chaque couche.
 */

/** Codes d'erreur exhaustifs pouvant être retournés par ce service. */
export type AttachmentServiceErrorCode =
  | "file_empty"
  | "file_too_large"
  | "unsupported_type"
  | "unauthorized_entity"
  | "attachment_not_found"
  | "storage_upload_failed"
  | "storage_cleanup_failed"
  | "storage_delete_failed"
  | "signed_url_failed"
  | "database_error";

export interface AttachmentServiceError {
  code: AttachmentServiceErrorCode;
  message: string;
  /** Détail technique (ex. message PostgREST/Storage brut), utile pour
   *  le débogage/logs — jamais nécessaire à afficher directement à
   *  l'utilisateur final. */
  details?: string;
}

export interface ServiceResult {
  error: AttachmentServiceError | null;
}

export interface GetAttachmentsResult extends ServiceResult {
  data: Attachment[];
}

export interface UploadAttachmentResult {
  data: Attachment | null;
  error: AttachmentServiceError | null;
}

export interface GetSignedAttachmentUrlResult {
  url: string | null;
  error: AttachmentServiceError | null;
}

/** Durée de vie des URLs signées, en secondes. Générées à la demande
 *  (au clic), jamais pré-générées ni persistées — voir point 14 du
 *  plan Lot 13A. */
const SIGNED_URL_TTL_SECONDS = 60;

/** Correspondance entre `AttachmentEntityType` et la colonne FK réelle
 *  de la table `attachments` (supabase/attachments.sql). Centralisé
 *  ici : aucun autre endroit du code ne doit connaître ces noms de
 *  colonnes SQL. */
const ENTITY_COLUMN: Record<AttachmentEntityType, "project_id" | "task_id" | "meeting_id"> = {
  project: "project_id",
  task: "task_id",
  meeting: "meeting_id",
};

/** Table Supabase propriétaire de chaque type d'entité, utilisée par
 *  `assertOwnsEntity()` pour vérifier l'appartenance avant tout upload. */
const ENTITY_TABLE: Record<AttachmentEntityType, "projects" | "tasks" | "meetings"> = {
  project: "projects",
  task: "tasks",
  meeting: "meetings",
};

/** Forme brute d'une ligne `attachments` telle que renvoyée par
 *  PostgREST (colonnes snake_case) — jamais exposée hors de ce fichier. */
interface AttachmentRow {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  meeting_id: string | null;
  entity_type: AttachmentEntityType;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

function serviceError(
  code: AttachmentServiceErrorCode,
  message: string,
  details?: string
): AttachmentServiceError {
  return { code, message, details };
}

/** Traduit une erreur PostgREST (ou toute erreur porteuse d'un
 *  `.message`) en `AttachmentServiceError`, en conservant son message
 *  d'origine dans `details` pour ne jamais masquer une erreur
 *  technique (panne réseau, violation RLS, etc.) derrière un message
 *  générique. */
function fromUnknownError(
  code: AttachmentServiceErrorCode,
  fallbackMessage: string,
  error: { message: string }
): AttachmentServiceError {
  return serviceError(code, fallbackMessage, error.message);
}

/** Type guard sur `ALLOWED_ATTACHMENT_MIME_TYPES`, sans recourir à un
 *  cast `as never` : `includes()` sur un tableau `readonly string[]`
 *  reste correctement typé tout en affinant `mimeType`. */
function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Vérifie que l'entité cible (`entityType`/`entityId`) appartient bien
 * à l'utilisateur courant, avant d'autoriser un upload ou un accès à
 * ses pièces jointes.
 *
 * Distingue explicitement une erreur technique (réseau/PostgREST) d'une
 * absence d'entité/autorisation : une panne ne doit jamais être
 * silencieusement transformée en "non autorisé".
 *
 * Conçue pour rester stable si des règles métier supplémentaires
 * doivent s'y ajouter plus tard (ex. interdire l'upload sur une
 * entité archivée) : ces règles s'inséreraient ici, sans changer la
 * signature ni l'usage de cette fonction ailleurs dans le service.
 */
async function assertOwnsEntity(
  entityType: AttachmentEntityType,
  entityId: string,
  userId: string
): Promise<AttachmentServiceError | null> {
  const { data, error } = await supabase
    .from(ENTITY_TABLE[entityType])
    .select("id")
    .eq("id", entityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return fromUnknownError(
      "database_error",
      "Impossible de vérifier l'appartenance de l'entité.",
      error
    );
  }

  if (!data) {
    return serviceError("unauthorized_entity", "Entité introuvable ou non autorisée.");
  }
  return null;
}

/**
 * Construit le chemin Storage d'un nouvel upload :
 * `{user_id}/{entity_type}/{entity_id}/{uuid}.{ext}`.
 *
 * L'extension est dérivée du type MIME *validé* via
 * `ATTACHMENT_EXTENSION_BY_MIME` (types/attachment.ts) — jamais de
 * l'extension présente dans le nom de fichier original, qui pourrait
 * être trompeuse (ex. "document.exe" déclaré comme
 * "application/pdf" serait sinon stocké avec l'extension .exe). Le nom
 * original reste stocké uniquement dans la colonne `file_name`.
 *
 * Rappel (voir types/attachment.ts) : `mimeType` est une déclaration
 * fournie par le navigateur, pas une inspection réelle du contenu du
 * fichier — cette fonction garantit uniquement la cohérence entre le
 * MIME validé et l'extension du chemin, pas l'exactitude du contenu.
 */
function buildStoragePath(
  userId: string,
  entityType: AttachmentEntityType,
  entityId: string,
  mimeType: AllowedAttachmentMimeType
): string {
  const extension = ATTACHMENT_EXTENSION_BY_MIME[mimeType];
  return `${userId}/${entityType}/${entityId}/${crypto.randomUUID()}.${extension}`;
}

/** Traduit une ligne brute `attachments` (snake_case) vers le type
 *  applicatif `Attachment` (camelCase), en fusionnant les 3 FK
 *  possibles en un couple unique `entityType`/`entityId`. */
function rowToAttachment(row: AttachmentRow): Attachment {
  const entityId =
    row[ENTITY_COLUMN[row.entity_type]] ??
    // Ne devrait jamais se produire grâce à
    // attachments_entity_type_match_check (supabase/attachments.sql),
    // mais évite un `entityId` silencieusement `null` si jamais ce cas
    // survenait malgré tout.
    "";

  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

/**
 * Valide un fichier avant upload : présence, taille et type MIME.
 * Fonction pure, sans appel réseau — pensée pour un retour instantané
 * dans l'UI du Lot 13B (ex. dès la sélection du fichier, avant tout
 * clic "envoyer").
 *
 * La configuration du bucket Storage et la contrainte
 * `attachments_mime_type_check` (supabase/attachments.sql) appliquent
 * les mêmes limites côté serveur, comme lignes de défense
 * supplémentaires indépendantes de cette validation cliente.
 */
export function validateAttachmentFile(file: File): AttachmentValidationError | null {
  if (file.size <= 0) {
    return {
      code: "file_empty",
      message: "Le fichier est vide.",
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      code: "file_too_large",
      message: `Le fichier dépasse la taille maximale autorisée (${MAX_ATTACHMENT_SIZE_MB} Mo).`,
    };
  }

  if (!isAllowedAttachmentMimeType(file.type)) {
    return {
      code: "unsupported_type",
      message: "Ce type de fichier n'est pas pris en charge.",
    };
  }

  return null;
}

/**
 * Récupère les pièces jointes d'une entité donnée, pour l'utilisateur
 * courant, triées de la plus récente à la plus ancienne.
 *
 * Vérifie explicitement l'appartenance de l'entité via
 * `assertOwnsEntity()` (plutôt que de s'appuyer uniquement sur la RLS
 * + un filtre renvoyant silencieusement une liste vide) afin que l'UI
 * (Lot 13B) puisse distinguer une entité inexistante/interdite d'une
 * entité existante sans pièce jointe — cohérent avec `uploadAttachment`.
 */
export async function listAttachments(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<GetAttachmentsResult> {
  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsEntity(entityType, entityId, userId);
  if (ownershipCheckError) {
    return { data: [], error: ownershipCheckError };
  }

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", userId)
    .eq(ENTITY_COLUMN[entityType], entityId)
    // Filtre explicite en plus de la FK ciblée : les contraintes SQL
    // (attachments_entity_type_match_check) rendent normalement toute
    // incohérence impossible, mais le service doit exprimer
    // explicitement son intention plutôt que de s'y fier implicitement.
    .eq("entity_type", entityType)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: fromUnknownError("database_error", "Impossible de charger les pièces jointes.", error),
    };
  }

  return {
    data: ((data as AttachmentRow[] | null) ?? []).map(rowToAttachment),
    error: null,
  };
}

/**
 * Upload un fichier vers le bucket Storage privé `attachments`, puis
 * insère la ligne `attachments` correspondante — dans cet ordre :
 * si l'insert DB échoue après un upload Storage réussi, l'objet
 * Storage orphelin est nettoyé immédiatement (best-effort). Si ce
 * nettoyage compensatoire échoue à son tour, l'erreur n'est jamais
 * masquée : elle est combinée à l'erreur d'insertion d'origine dans le
 * message/details retournés, afin que l'appelant sache qu'un fichier
 * orphelin peut subsister.
 */
export async function uploadAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  file: File
): Promise<UploadAttachmentResult> {
  const validationError = validateAttachmentFile(file);
  if (validationError) {
    return { data: null, error: serviceError(validationError.code, validationError.message) };
  }

  // Sûr après validateAttachmentFile() : le type MIME est garanti
  // faire partie de la liste blanche à ce stade.
  const mimeType = file.type as AllowedAttachmentMimeType;

  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsEntity(entityType, entityId, userId);
  if (ownershipCheckError) {
    return { data: null, error: ownershipCheckError };
  }

  const storagePath = buildStoragePath(userId, entityType, entityId, mimeType);

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, file, { contentType: mimeType });

  if (uploadError) {
    return {
      data: null,
      error: fromUnknownError("storage_upload_failed", "L'envoi du fichier a échoué.", uploadError),
    };
  }

  const { data, error: insertError } = await supabase
    .from("attachments")
    .insert({
      user_id: userId,
      [ENTITY_COLUMN[entityType]]: entityId,
      entity_type: entityType,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insertError) {
    // Nettoyage compensatoire best-effort. Si ce nettoyage échoue
    // aussi, l'erreur n'est PAS masquée : elle est reportée dans
    // `details`, avec un code dédié `storage_cleanup_failed` pour que
    // l'appelant sache explicitement qu'un fichier orphelin peut
    // subsister (voir la note correspondante dans supabase/attachments.sql).
    const { error: cleanupError } = await supabase.storage.from("attachments").remove([storagePath]);

    if (cleanupError) {
      return {
        data: null,
        error: serviceError(
          "storage_cleanup_failed",
          "L'enregistrement de la pièce jointe a échoué, et le fichier envoyé n'a pas pu être nettoyé automatiquement (fichier orphelin possible).",
          `insert: ${insertError.message}; cleanup: ${cleanupError.message}`
        ),
      };
    }

    return {
      data: null,
      error: fromUnknownError(
        "database_error",
        "L'enregistrement de la pièce jointe a échoué.",
        insertError
      ),
    };
  }

  return { data: rowToAttachment(data as AttachmentRow), error: null };
}

/**
 * Génère une URL signée temporaire (durée de vie : {@link SIGNED_URL_TTL_SECONDS}
 * secondes) permettant de consulter/télécharger une pièce jointe.
 * Appelée à la demande (ex. au clic sur "télécharger") — jamais
 * pré-générée ni mise en cache/persistée.
 *
 * Prend volontairement un simple `id` plutôt qu'un objet `Attachment`
 * complet fourni par l'appelant : le `storage_path` utilisé est
 * toujours celui lu depuis la base pour cette ligne précise
 * (filtrée par `id` ET `user_id`), jamais une valeur transmise par le
 * composant appelant — même si la policy Storage protège déjà les
 * préfixes d'autres utilisateurs, cela évite qu'un composant puisse
 * fournir arbitrairement un `storagePath` falsifié.
 */
export async function getSignedAttachmentUrl(id: string): Promise<GetSignedAttachmentUrlResult> {
  const userId = await getRequiredUserId();

  const { data, error: selectError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    return {
      url: null,
      error: fromUnknownError("database_error", "Impossible de récupérer la pièce jointe.", selectError),
    };
  }
  if (!data) {
    return { url: null, error: serviceError("attachment_not_found", "Pièce jointe introuvable ou non autorisée.") };
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("attachments")
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signedUrlError) {
    return {
      url: null,
      error: fromUnknownError("signed_url_failed", "Impossible de générer le lien de téléchargement.", signedUrlError),
    };
  }

  return { url: signedUrlData.signedUrl, error: null };
}

/**
 * Supprime une pièce jointe : suppression de la ligne DB (avec
 * récupération du `storage_path` dans la même requête, via
 * `.select()` après `.delete()`, pour garantir que ce chemin
 * correspond exactement à la ligne effectivement supprimée et réduire
 * la fenêtre de concurrence), puis suppression de l'objet Storage
 * correspondant.
 *
 * Si la suppression Storage échoue après un succès de la suppression
 * DB, un fichier orphelin peut subsister ; ce cas est documenté comme
 * limite assumée de ce lot (voir supabase/attachments.sql), à traiter
 * par un futur outillage de nettoyage. L'erreur est néanmoins toujours
 * remontée explicitement à l'appelant, jamais masquée.
 */
export async function deleteAttachment(id: string): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { data, error: deleteRowError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("storage_path")
    .maybeSingle();

  if (deleteRowError) {
    return {
      error: fromUnknownError("database_error", "La suppression de la pièce jointe a échoué.", deleteRowError),
    };
  }
  if (!data) {
    return { error: serviceError("attachment_not_found", "Pièce jointe introuvable ou non autorisée.") };
  }

  const { error: deleteStorageError } = await supabase.storage
    .from("attachments")
    .remove([data.storage_path]);

  if (deleteStorageError) {
    // La ligne DB est déjà supprimée à ce stade : voir la note
    // "fichiers orphelins" dans supabase/attachments.sql. On remonte
    // néanmoins l'erreur pour informer l'appelant du problème Storage.
    return {
      error: fromUnknownError(
        "storage_delete_failed",
        "La pièce jointe a été supprimée, mais le fichier associé n'a pas pu être supprimé du stockage (fichier orphelin possible).",
        deleteStorageError
      ),
    };
  }

  return { error: null };
}

// TODO (lot futur) : replaceAttachment(id, file) — remplacerait une
// pièce jointe existante (nouvel upload + suppression de l'ancienne)
// sans jamais écraser l'objet Storage en place, cohérent avec
// l'absence de policy UPDATE côté Storage (supabase/attachments.sql).
// Non implémentée dans ce lot (pas de versionnage — voir contraintes
// du plan Lot 13A).
