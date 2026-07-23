/**
 * Helpers de date génériques, réellement partagés entre `lib/calendar.ts`
 * (vue calendrier) et `lib/meeting-grouping.ts` (agenda/dashboard).
 *
 * Toujours basés sur les composantes calendaires locales
 * (`getFullYear/getMonth/getDate/getDay`) — jamais de parsing de chaîne
 * ISO, jamais de `Date.UTC` — pour éviter tout décalage de fuseau
 * horaire, quel que soit le fuseau du navigateur.
 */

/** Clé de jour locale "YYYY-MM-DD" pour une date donnée. */
export function getLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Index du jour de la semaine avec lundi = 0 ... dimanche = 6 (contrairement
 * à `Date.getDay()` qui démarre à dimanche = 0). Utilisé pour calculer
 * l'offset jusqu'au lundi de la semaine locale contenant `date`.
 */
export function getMondayBasedDayIndex(date: Date): number {
  const day = date.getDay(); // 0 = dimanche ... 6 = samedi
  return day === 0 ? 6 : day - 1;
}
