export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function cleanStatus(status: string) {
  return status?.trim().toLowerCase();
}

/**
 * Formate une taille de fichier en octets vers l'unité la plus lisible
 * (o / Ko / Mo / Go). Utilisé par l'onglet "Pièces jointes" (Lot 15,
 * components/attachments/AttachmentItem.tsx) pour afficher
 * `Attachment.sizeBytes` (types/attachment.ts) sans dupliquer cette
 * logique dans chaque composant.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 o";

  const units = ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const decimals = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}
