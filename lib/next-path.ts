/**
 * Valide qu'une chaîne représente un chemin interne sûr, utilisable comme
 * cible de redirection (`?next=`) sans risque d'open-redirect.
 *
 * Accepté :  "/meetings", "/meetings?status=planned"
 * Rejeté  :  "//evil.com", "https://evil.com", "javascript:...", ""
 */
export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  return true;
}

/** Retourne `value` s'il est un chemin interne sûr, sinon `fallback` (par défaut `/`). */
export function sanitizeNextPath(
  value: string | null | undefined,
  fallback = "/"
): string {
  return isSafeInternalPath(value) ? value : fallback;
}
