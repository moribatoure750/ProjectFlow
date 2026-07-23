import { getLocalDayKey, getMondayBasedDayIndex } from "@/lib/date-utils";
import type { MeetingWithProject } from "@/types/meeting";


export interface MeetingGroup {
  /** Clé stable "YYYY-MM-DD" (calendrier local), utilisée comme React key. */
  key: string;
  /** Libellé affiché en en-tête de groupe (ex. "Aujourd'hui", "Vendredi"). */
  label: string;
  /** Date complète affichée à côté du libellé (ex. "23 juillet 2026"). */
  fullDate: string;
  meetings: MeetingWithProject[];
}

/**
 * Formate une plage horaire à partir de deux dates ISO (`timestamptz`),
 * ex. "09:00 → 10:00". Utilise l'heure locale du navigateur.
 */
export function formatTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }

  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  return `${start.toLocaleTimeString("fr-CA", timeFormat)} → ${end.toLocaleTimeString(
    "fr-CA",
    timeFormat
  )}`;
}

/** Retourne la clé de jour locale "YYYY-MM-DD" pour une date donnée. */
const dayKey = getLocalDayKey;


/**
 * Bornes de la semaine locale courante (lundi 00:00:00 → dimanche
 * 23:59:59.999), construites uniquement à partir des composantes
 * calendaires locales (`getFullYear/getMonth/getDate`) — jamais de
 * parsing de chaîne, pour éviter tout décalage de fuseau horaire.
 * Exportée pour être réutilisée dans app/page.tsx (statistique
 * "Réunions cette semaine").
 */
export function getWeekRange(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const mondayOffset = getMondayBasedDayIndex(date);
  const start = new Date(

    date.getFullYear(),
    date.getMonth(),
    date.getDate() - mondayOffset
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
    23,
    59,
    59,
    999
  );
  return { start, end };
}

/** Nombre de jours calendaires entre deux dates (composantes locales
 * uniquement, heures ignorées), `to - from`. Exportée pour être réutilisée
 * dans app/meetings/page.tsx (filtres de période, séparation passé/futur). */
export function daysBetween(from: Date, to: Date): number {


  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const WEEKDAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/**
 * Libellé humain d'un jour, relatif à `today` (composantes calendaires
 * locales, jamais d'heure) :
 *  - 0 jour  → "Aujourd'hui"
 *  - 1 jour  → "Demain"
 *  - 2 à 6   → nom du jour (ex. "Vendredi")
 *  - 7 à 13  → "La semaine prochaine"
 *  - au-delà → date complète courte (ex. "12 août")
 *  - jours passés (< 0) → date complète courte également (la section
 *    "Réunions passées" est gérée séparément par l'appelant).
 */
export function getDayLabel(date: Date, today: Date): string {
  const diff = daysBetween(today, date);

  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff > 1 && diff < 7) return WEEKDAY_LABELS[date.getDay()];
  if (diff >= 7 && diff < 14) return "La semaine prochaine";

  return date.toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
}

/** Date complète affichée en complément du libellé, ex. "jeudi 23 juillet". */
function getFullDateLabel(date: Date): string {
  return date.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Regroupe des réunions par jour calendaire local, triées chronologiquement
 * (groupes puis réunions au sein de chaque groupe).
 *
 * `starts_at`/`ends_at` sont des `timestamptz` (UTC) : le regroupement est
 * volontairement basé sur l'heure locale du navigateur pour que
 * "Aujourd'hui" corresponde à la journée réellement vécue par
 * l'utilisateur (même précaution que `getDueDateTone` dans /tasks).
 */
export function groupMeetingsByDay(
  meetings: MeetingWithProject[],
  today: Date = new Date()
): MeetingGroup[] {
  const groups = new Map<string, MeetingGroup>();

  const sorted = [...meetings].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  for (const meeting of sorted) {
    const start = new Date(meeting.starts_at);
    if (Number.isNaN(start.getTime())) continue;

    const key = dayKey(start);
    const existing = groups.get(key);

    if (existing) {
      existing.meetings.push(meeting);
    } else {
      groups.set(key, {
        key,
        label: getDayLabel(start, today),
        fullDate: getFullDateLabel(start),
        meetings: [meeting],
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * `true` si la réunion commence dans moins de 60 minutes (et n'a pas
 * encore commencé). Purement informatif : ne modifie aucune donnée.
 */
export function isStartingSoon(startsAt: string, now: Date = new Date()): boolean {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;

  const diffMinutes = (start.getTime() - now.getTime()) / 60_000;
  return diffMinutes > 0 && diffMinutes <= 60;
}

/**
 * `true` si la réunion est actuellement en cours : statut "planned",
 * `starts_at` déjà passé (ou maintenant) et `ends_at` pas encore atteint.
 * Une réunion "completed" ou "cancelled" n'est jamais considérée comme en
 * cours, même si ses dates chevauchent `now` — le statut prime toujours
 * sur les dates. `now` par défaut à `new Date()` mais peut être fourni
 * explicitement pour éviter plusieurs appels incohérents à `new Date()`
 * dans un même rendu (voir app/page.tsx, app/meetings/page.tsx,
 * components/meetings/MeetingCalendar.tsx).
 */
export function isMeetingInProgress(
  meeting: MeetingWithProject,
  now: Date = new Date()
): boolean {
  if (meeting.status !== "planned") return false;

  const start = new Date(meeting.starts_at);
  const end = new Date(meeting.ends_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  return start.getTime() <= now.getTime() && end.getTime() > now.getTime();
}

