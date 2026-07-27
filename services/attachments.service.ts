import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getRequiredUserId } from "@/lib/supabase/current-user";

import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
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
 */

export interface ServiceResult {
  error: PostgrestError | null;
}

export interface GetAttachmentsResult extends ServiceResult {
  data: Attachment[];
}

export interface UploadAttachmentResult {
  data: Attachment | null;
  /**
   * Soit une erreur de validation (fichier trop volumineux / type non
   * supporté, détectée avant tout appel réseau), soit une erreur
   * PostgREST/Storage. Les deux formes exposent un champ `message`
   * exploitable directement par l'UI (Lot 13B) ; pour distinguer les
   * deux cas si besoin, une erreur de validation expose un `code`
   * parmi "file_too_large" / "unsupported_type".
   */
  error: PostgrestError | AttachmentValidationError | null;
}

export interface GetSignedAttachmentUrlResult {
  url: string | null;
  error: PostgrestError | null;
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

/** Construit une erreur de forme `PostgrestError`, pour les cas où le
 *  service détecte lui-même un problème avant d'atteindre PostgREST
 *  (appartenance d'entité non vérifiée) — même pattern que
 *  `ownershipError()` dans tasks.service.ts / meetings.service.ts. */
function serviceError(message: string, code: string): PostgrestError {
  return {
    message,
    details: "",
    hint: "",
    code,
    name: "PostgrestError",
    toJSON() {
      return { message, details: "", hint: "", code, name: "PostgrestError" };
    },
  };
}

/**
 * Vérifie que l'entité cible (`entityType`/`entityId`) appartient bien
 * à l'utilisateur courant, avant d'autoriser un upload ou un accès à
 * ses pièces jointes.
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
): Promise<PostgrestError | null> {
  const { data } = await supabase
    .from(ENTITY_TABLE[entityType])
    .select("id")
    .eq("id", entityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return serviceError("Entité introuvable ou non autorisée.", "42501");
  }
  return null;
}

/** Extrait l'extension d'un nom de fichier (sans le point), en
 *  minuscules, ou `""` si absente. Utilisée uniquement pour construire
 *  le chemin Storage — jamais pour valider le type du fichier (voir
 *  `validateAttachmentFile`, basée sur le MIME type réel). */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return "";
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}

/**
 * Construit le chemin Storage d'un nouvel upload :
 * `{user_id}/{entity_type}/{entity_id}/{uuid}.{ext}`.
 *
 * Le nom original du fichier n'apparaît jamais dans ce chemin (évite
 * collisions, caractères spéciaux/URL-unsafe, fuite du nom réel dans
 * les logs Storage) — seule l'extension est reprise ; le nom complet
 * est stocké uniquement dans la colonne `file_name`.
 */
function buildStoragePath(
  userId: string,
  entityType: AttachmentEntityType,
  entityId: string,
  fileName: string
): string {
  const extension = getFileExtension(fileName);
  const uniqueName = extension ? `${crypto.randomUUID()}.${extension}` : crypto.randomUUID();
  return `${userId}/${entityType}/${entityId}/${uniqueName}`;
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
 * Valide un fichier avant upload : taille et type MIME. Fonction pure,
 * sans appel réseau — pensée pour un retour instantané dans l'UI du
 * Lot 13B (ex. dès la sélection du fichier, avant tout clic "envoyer").
 *
 * La configuration du bucket Storage (supabase/attachments.sql)
 * applique les mêmes limites côté serveur, comme deuxième ligne de
 * défense indépendante de cette validation cliente.
 */
export function validateAttachmentFile(file: File): AttachmentValidationError | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      code: "file_too_large",
      message: `Le fichier dépasse la taille maximale autorisée (${MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} Mo).`,
    };
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as never)) {
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
 */
export async function listAttachments(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<GetAttachmentsResult> {
  const userId = await getRequiredUserId();

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", userId)
    .eq(ENTITY_COLUMN[entityType], entityId)
    .order("created_at", { ascending: false });

  return {
    data: ((data as AttachmentRow[] | null) ?? []).map(rowToAttachment),
    error,
  };
}

/**
 * Upload un fichier vers le bucket Storage privé `attachments`, puis
 * insère la ligne `attachments` correspondante — dans cet ordre :
 * si l'insert DB échoue après un upload Storage réussi, l'objet
 * Storage orphelin est nettoyé immédiatement (best-effort) pour éviter
 * d'accumuler des fichiers sans ligne DB associée.
 */
export async function uploadAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  file: File
): Promise<UploadAttachmentResult> {
  const validationError = validateAttachmentFile(file);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const userId = await getRequiredUserId();

  const ownershipCheckError = await assertOwnsEntity(entityType, entityId, userId);
  if (ownershipCheckError) {
    return { data: null, error: ownershipCheckError };
  }

  const storagePath = buildStoragePath(userId, entityType, entityId, file.name);

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { data: null, error: serviceError(uploadError.message, "storage_upload_failed") };
  }

  const { data, error: insertError } = await supabase
    .from("attachments")
    .insert({
      user_id: userId,
      [ENTITY_COLUMN[entityType]]: entityId,
      entity_type: entityType,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insertError) {
    // Best-effort : nettoie l'objet Storage orphelin. Une erreur ici
    // n'est pas remontée à l'appelant (l'erreur pertinente reste
    // `insertError`) mais laisserait un fichier orphelin détectable
    // par le futur outillage de nettoyage (voir supabase/attachments.sql).
    await supabase.storage.from("attachments").remove([storagePath]);
    return { data: null, error: insertError };
  }

  return { data: rowToAttachment(data as AttachmentRow), error: null };
}

/**
 * Génère une URL signée temporaire (durée de vie : {@link SIGNED_URL_TTL_SECONDS}
 * secondes) permettant de consulter/télécharger une pièce jointe.
 * Appelée à la demande (ex. au clic sur "télécharger") — jamais
 * pré-générée ni mise en cache/persistée.
 */
export async function getSignedAttachmentUrl(
  attachment: Attachment
): Promise<GetSignedAttachmentUrlResult> {
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(attachment.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return { url: null, error: serviceError(error.message, "storage_signed_url_failed") };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Supprime une pièce jointe : d'abord la ligne DB, puis l'objet
 * Storage correspondant (ordre choisi pour ce lot — voir la note dans
 * supabase/attachments.sql). Si la suppression Storage échoue après
 * un succès de la suppression DB, un fichier orphelin peut subsister
 * ; ce cas est documenté comme limite assumée de ce lot, à traiter par
 * un futur outillage de nettoyage.
 */
export async function deleteAttachment(id: string): Promise<ServiceResult> {
  const userId = await getRequiredUserId();

  const { data, error: selectError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    return { error: selectError };
  }
  if (!data) {
    return { error: serviceError("Pièce jointe introuvable ou non autorisée.", "42501") };
  }

  const { error: deleteRowError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteRowError) {
    return { error: deleteRowError };
  }

  const { error: deleteStorageError } = await supabase.storage
    .from("attachments")
    .remove([data.storage_path]);

  if (deleteStorageError) {
    // La ligne DB est déjà supprimée à ce stade : voir la note
    // "fichiers orphelins" dans supabase/attachments.sql. On remonte
    // néanmoins l'erreur pour informer l'appelant du problème Storage.
    return { error: serviceError(deleteStorageError.message, "storage_delete_failed") };
  }

  return { error: null };
}

// TODO (lot futur) : replaceAttachment(id, file) — remplacerait une
// pièce jointe existante (nouvel upload + suppression de l'ancienne)
// sans jamais écraser l'objet Storage en place, cohérent avec
// l'absence de policy UPDATE côté Storage (supabase/attachments.sql).
// Non implémentée dans ce lot (pas de versionnage — voir contraintes
// du plan Lot 13A).
