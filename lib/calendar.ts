import { getLocalDayKey, getMondayBasedDayIndex } from "@/lib/date-utils";
import type { MeetingWithProject } from "@/types/meeting";


/**
 * Une case de la grille mensuelle/hebdomadaire, construite uniquement à
 * partir des composantes calendaires locales (`getFullYear/getMonth/getDate`)
 * — jamais de parsing de chaîne ISO — pour éviter tout décalage de fuseau
 * horaire, même précaution que `lib/meeting-grouping.ts`.
 */
export interface CalendarDay {
  date: Date;
  /** Clé stable "YYYY-MM-DD" (calendrier local). */
  key: string;
  /** `false` pour les jours de bourrage (mois précédent/suivant) affichés
   * en périphérie de la grille mensuelle 6×7. Toujours `true` pour
   * `getWeekDays` (non pertinent dans une vue semaine). */
  inCurrentMonth: boolean;
  isToday: boolean;
}

/** Clé de jour locale "YYYY-MM-DD" pour une date donnée. Alias de
 * `getLocalDayKey` (voir `lib/date-utils.ts`), conservé sous ce nom pour
 * ne rien changer aux imports existants dans `MeetingCalendar.tsx`. */
export const dayKeyLocal = getLocalDayKey;


function buildCalendarDay(date: Date, month: number, todayKey: string): CalendarDay {
  const key = dayKeyLocal(date);
  return {
    date,
    key,
    inCurrentMonth: date.getMonth() === month,
    isToday: key === todayKey,
  };
}

/**
 * Grille de 42 jours (6 semaines × 7 jours, lundi → dimanche) couvrant le
 * mois de `monthDate`, avec les jours de bourrage du mois précédent/suivant
 * nécessaires pour compléter la première/dernière semaine.
 */
export function getMonthGrid(monthDate: Date, today: Date = new Date()): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = getMondayBasedDayIndex(firstOfMonth);
  const start = new Date(year, month, 1 - mondayOffset);

  const todayKey = dayKeyLocal(today);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push(buildCalendarDay(date, month, todayKey));
  }
  return days;
}

/**
 * 7 jours (lundi → dimanche) de la semaine locale contenant `date`.
 * Utilisée par la vue mobile simplifiée (bandeau de semaine + liste du
 * jour sélectionné).
 */
export function getWeekDays(date: Date, today: Date = new Date()): CalendarDay[] {
  const mondayOffset = getMondayBasedDayIndex(date);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset);

  const todayKey = dayKeyLocal(today);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push(buildCalendarDay(d, d.getMonth(), todayKey));
  }
  return days;
}

/**
 * Regroupe des réunions par clé de jour locale ("YYYY-MM-DD"), triées
 * chronologiquement au sein de chaque jour. Ne filtre rien : l'appelant
 * (`MeetingCalendar`) reçoit déjà les réunions filtrées par la page
 * (recherche/projet/statut), pour ne jamais dupliquer cette logique.
 */
export function groupMeetingsByDayKey(
  meetings: MeetingWithProject[]
): Map<string, MeetingWithProject[]> {
  const map = new Map<string, MeetingWithProject[]>();

  for (const meeting of meetings) {
    const start = new Date(meeting.starts_at);
    if (Number.isNaN(start.getTime())) continue;

    const key = dayKeyLocal(start);
    const existing = map.get(key);
    if (existing) existing.push(meeting);
    else map.set(key, [meeting]);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return map;
}

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Libellé "Juillet 2026" pour l'en-tête de navigation du calendrier. */
export function formatMonthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Nouvelle Date au 1er jour du mois, décalée de `delta` mois. */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
