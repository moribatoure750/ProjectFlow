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
 * Heure locale courte (ex. "14:32"), en complément de `formatDate()`
 * qui ne renvoie que le jour — utilisée par les commentaires
 * (components/comments/CommentItem.tsx). `ActivityItem`
 * (components/activity/ActivityItem.tsx) définit une fonction
 * équivalente localement ; non factorisée ici pour ne pas modifier ce
 * composant existant (Lot 16A/16B), voir AGENTS/consignes du Lot 17A.
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
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
