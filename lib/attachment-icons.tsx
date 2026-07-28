import type { ComponentType, SVGProps } from "react";

import type { BadgeTone } from "@/components/ui/Badge";
import {
  ArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  PdfIcon,
  PresentationIcon,
  WordIcon,
} from "@/components/ui/icons";

/**
 * Catégorisation visuelle d'une pièce jointe (Lot 15.5), dérivée du
 * `mimeType` déjà validé par `services/attachments.service.ts`
 * (`ALLOWED_ATTACHMENT_MIME_TYPES`, types/attachment.ts). Purement
 * présentationnel — n'influence jamais la validation ni le stockage.
 */
export type AttachmentCategory =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "image"
  | "archive"
  | "text"
  | "other";

export interface AttachmentIconMeta {
  category: AttachmentCategory;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: BadgeTone;
}

const META_BY_CATEGORY: Record<AttachmentCategory, AttachmentIconMeta> = {
  pdf: { category: "pdf", label: "PDF", Icon: PdfIcon, tone: "red" },
  word: { category: "word", label: "Word", Icon: WordIcon, tone: "blue" },
  excel: { category: "excel", label: "Excel", Icon: FileSpreadsheetIcon, tone: "green" },
  powerpoint: {
    category: "powerpoint",
    label: "PowerPoint",
    Icon: PresentationIcon,
    tone: "orange",
  },
  image: { category: "image", label: "Image", Icon: ImageIcon, tone: "purple" },
  archive: { category: "archive", label: "Archive", Icon: ArchiveIcon, tone: "gray" },
  text: { category: "text", label: "Texte", Icon: FileTextIcon, tone: "gray" },
  other: { category: "other", label: "Fichier", Icon: FileIcon, tone: "gray" },
};

/**
 * Résout la catégorie/icône/teinte à afficher pour un `mimeType` donné.
 * Couvre exactement l'ensemble `ALLOWED_ATTACHMENT_MIME_TYPES`
 * (types/attachment.ts) + un repli `other` défensif si jamais ce
 * mapping devait être appelé avec une valeur hors liste blanche.
 */
export function getAttachmentIconMeta(mimeType: string): AttachmentIconMeta {
  switch (mimeType) {
    case "application/pdf":
      return META_BY_CATEGORY.pdf;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return META_BY_CATEGORY.word;
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return META_BY_CATEGORY.excel;
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return META_BY_CATEGORY.powerpoint;
    case "image/png":
    case "image/jpeg":
    case "image/gif":
    case "image/webp":
      return META_BY_CATEGORY.image;
    case "application/zip":
    case "application/x-zip-compressed":
      return META_BY_CATEGORY.archive;
    case "text/plain":
      return META_BY_CATEGORY.text;
    default:
      return META_BY_CATEGORY.other;
  }
}

export function isPreviewableImage(mimeType: string): boolean {
  return getAttachmentIconMeta(mimeType).category === "image";
}

export function isPreviewablePdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
