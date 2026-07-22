"use client";

import type { KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";


import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@/components/ui/icons";
import {
  addMonths,
  dayKeyLocal,
  formatMonthLabel,
  getMonthGrid,
  getWeekDays,
  groupMeetingsByDayKey,
} from "@/lib/calendar";

import { meetingStatusInfo } from "@/lib/badge-tones";
import { cn } from "@/lib/utils";
import type { MeetingWithProject } from "@/types/meeting";

interface MeetingCalendarProps {
  /** Réunions déjà filtrées (recherche/projet/statut) par la page parente —
   * cette logique n'est jamais dupliquée ici. */
  meetings: MeetingWithProject[];
  /** Ouvre la modal d'édition existante (`MeetingFormModal`) via la page
   * parente. Aucune seconde logique d'édition n'est créée ici. */
  onEdit: (meeting: MeetingWithProject) => void;
}

/** Pastille de couleur pleine pour chaque statut — dérivée des mêmes tokens
 * sémantiques que `Badge`, jamais de nouvelle couleur introduite. La
 * couleur seule n'est jamais la seule information : heure + titre
 * textuels sont toujours affichés à côté. */
const DOT_TONE_CLASSES: Record<BadgeTone, string> = {
  gray: "bg-fg-subtle",
  blue: "bg-info-600",
  green: "bg-success-600",
  red: "bg-danger-600",
  orange: "bg-warning-600",
  purple: "bg-accent",
};

const WEEKDAY_HEADERS = [
  { short: "Lun", full: "Lundi" },
  { short: "Mar", full: "Mardi" },
  { short: "Mer", full: "Mercredi" },
  { short: "Jeu", full: "Jeudi" },
  { short: "Ven", full: "Vendredi" },
  { short: "Sam", full: "Samedi" },
  { short: "Dim", full: "Dimanche" },
];

const MAX_VISIBLE_PER_CELL = 3;

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatStartTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

/** Ligne compacte cliquable pour une réunion — réutilisée dans la modal
 * "jour complet" (desktop, "+N") et dans la liste du jour sélectionné
 * (mobile). Toujours titre + heure + statut, jamais une couleur seule. */
function MeetingRow({
  meeting,
  onSelect,
}: {
  meeting: MeetingWithProject;
  onSelect: () => void;
}) {
  const statusInfo = meetingStatusInfo(meeting.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border border-border px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <ClockIcon className="h-3.5 w-3.5 text-fg-subtle" />
          {formatStartTime(meeting.starts_at)}
        </span>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <p className="mt-1 truncate text-sm text-fg">{meeting.title}</p>
      {meeting.projects?.title && (
        <p className="mt-0.5 truncate text-xs text-fg-subtle">
          {meeting.projects.title}
        </p>
      )}
    </button>
  );
}

export function MeetingCalendar({ meetings, onEdit }: MeetingCalendarProps) {
  const today = useMemo(() => new Date(), []);

  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [dayModalKey, setDayModalKey] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const meetingsByDay = useMemo(
    () => groupMeetingsByDayKey(meetings),
    [meetings]
  );

  const monthGrid = useMemo(
    () => getMonthGrid(viewDate, today),
    [viewDate, today]
  );
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, today),
    [selectedDate, today]
  );

  const selectedDayKey = dayKeyLocal(selectedDate);
  const selectedDayMeetings = meetingsByDay.get(selectedDayKey) ?? [];
  const dayModalMeetings = dayModalKey
    ? meetingsByDay.get(dayModalKey) ?? []
    : [];

  function goToPrevMonth() {
    const next = addMonths(viewDate, -1);
    setViewDate(next);
    setSelectedDate(next);
  }

  function goToNextMonth() {
    const next = addMonths(viewDate, 1);
    setViewDate(next);
    setSelectedDate(next);
  }

  function goToToday() {
    const t = new Date();
    setViewDate(t);
    setSelectedDate(t);
  }

  /** Navigation clavier par flèches entre les cases de la grille desktop
   * (roving focus sur le numéro de jour de chaque case, identifié par
   * `data-index`). Home/End ramènent au premier/dernier jour de la
   * semaine affichée. */
  function handleGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {

    const target = e.target as HTMLElement;
    const idxAttr = target.getAttribute("data-index");
    if (idxAttr === null) return;

    const idx = Number(idxAttr);
    let nextIdx: number | null = null;

    switch (e.key) {
      case "ArrowRight":
        nextIdx = idx + 1;
        break;
      case "ArrowLeft":
        nextIdx = idx - 1;
        break;
      case "ArrowDown":
        nextIdx = idx + 7;
        break;
      case "ArrowUp":
        nextIdx = idx - 7;
        break;
      case "Home":
        nextIdx = idx - (idx % 7);
        break;
      case "End":
        nextIdx = idx - (idx % 7) + 6;
        break;
      default:
        return;
    }

    if (nextIdx === null || nextIdx < 0 || nextIdx > 41) return;
    e.preventDefault();
    const nextEl = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-index="${nextIdx}"]`
    );
    nextEl?.focus();
  }

  const navButtonClasses =
    "rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div>
      {/* En-tête de navigation — commun desktop/mobile */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrevMonth}
            aria-label="Mois précédent"
            className={navButtonClasses}
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Mois suivant"
            className={navButtonClasses}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <h2 className="ml-2 min-w-36 text-sm font-semibold capitalize text-fg">
            {formatMonthLabel(viewDate)}
          </h2>
        </div>
        <button
          type="button"
          onClick={goToToday}
          aria-label="Aller à aujourd'hui"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Aujourd&apos;hui
        </button>
      </div>

      {/* ---- Desktop / tablette (≥640px) : grille mensuelle complète ---- */}
      <div className="hidden sm:block">
        <div
          className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border"
          role="grid"
          aria-label={`Calendrier des réunions, ${formatMonthLabel(viewDate)}`}
        >
          <div role="row" className="col-span-7 grid grid-cols-7 gap-px">
            {WEEKDAY_HEADERS.map((wd) => (
              <div
                key={wd.short}
                role="columnheader"
                aria-label={wd.full}
                className="bg-surface-muted px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-fg-subtle"
              >
                {wd.short}
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            onKeyDown={handleGridKeyDown}
            role="rowgroup"
            className="col-span-7 grid grid-cols-7 gap-px"
          >
            {monthGrid.map((day, i) => {
              const dayMeetings = meetingsByDay.get(day.key) ?? [];
              const visible = dayMeetings.slice(0, MAX_VISIBLE_PER_CELL);
              const extra = dayMeetings.length - visible.length;

              return (
                <div
                  key={day.key}
                  role="gridcell"
                  className={cn(
                    "min-h-24 bg-surface p-1.5",
                    !day.inCurrentMonth && "bg-surface-muted"
                  )}
                >
                  <button
                    type="button"
                    data-index={i}
                    onClick={() =>
                      dayMeetings.length > 0 && setDayModalKey(day.key)
                    }
                    disabled={dayMeetings.length === 0}
                    aria-label={`${formatFullDate(day.date)}${
                      dayMeetings.length > 0
                        ? `, ${dayMeetings.length} réunion${dayMeetings.length > 1 ? "s" : ""}`
                        : ""
                    }`}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                      day.isToday
                        ? "bg-accent text-accent-foreground"
                        : day.inCurrentMonth
                          ? "text-fg hover:bg-surface-hover"
                          : "text-fg-subtle hover:bg-surface-hover"
                    )}
                  >
                    {day.date.getDate()}
                  </button>

                  <div className="mt-1 space-y-1">
                    {visible.map((meeting) => {
                      const statusInfo = meetingStatusInfo(meeting.status);
                      return (
                        <button
                          key={meeting.id}
                          type="button"
                          onClick={() => onEdit(meeting)}
                          title={meeting.title}
                          className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              DOT_TONE_CLASSES[statusInfo.tone]
                            )}
                          />
                          <span className="shrink-0 font-medium text-fg-subtle">
                            {formatStartTime(meeting.starts_at)}
                          </span>
                          <span className="truncate">{meeting.title}</span>
                        </button>
                      );
                    })}

                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => setDayModalKey(day.key)}
                        className="w-full rounded px-1 py-0.5 text-left text-[11px] font-medium text-accent transition-colors duration-150 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        +{extra} autre{extra > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Mobile (<640px) : bandeau de semaine + jour sélectionné ---- */}
      <div className="sm:hidden">
        <div
          role="tablist"
          aria-label="Jours de la semaine"
          className="flex gap-1.5 overflow-x-auto pb-1"
        >
          {weekDays.map((day) => {
            const key = day.key;
            const isSelected = key === selectedDayKey;
            const count = (meetingsByDay.get(key) ?? []).length;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${formatFullDate(day.date)}${
                  count > 0 ? `, ${count} réunion${count > 1 ? "s" : ""}` : ""
                }`}
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-fg-muted hover:bg-surface-hover",
                  day.isToday && !isSelected && "border-accent text-accent"
                )}
              >
                <span>
                  {WEEKDAY_HEADERS[
                    (day.date.getDay() + 6) % 7
                  ].short.slice(0, 1)}
                </span>
                <span className="text-sm font-semibold">
                  {day.date.getDate()}
                </span>
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isSelected ? "bg-accent-foreground" : "bg-accent"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4" role="tabpanel">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold capitalize text-fg">
            <CalendarIcon className="h-4 w-4 text-fg-subtle" />
            {formatFullDate(selectedDate)}
          </h3>

          {selectedDayMeetings.length === 0 ? (
            <EmptyState
              compact
              title="Aucune réunion ce jour-là"
              description="Sélectionnez un autre jour ou créez une nouvelle réunion."
            />
          ) : (
            <div className="space-y-2">
              {selectedDayMeetings.map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  onSelect={() => onEdit(meeting)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal "jour complet" — desktop uniquement (clic sur le numéro de
          jour ou sur "+N"), réutilise la même action d'édition. */}
      <Modal
        open={dayModalKey !== null}
        onClose={() => setDayModalKey(null)}
        title={
          dayModalKey
            ? formatFullDate(new Date(dayModalMeetings[0]?.starts_at ?? dayModalKey))
            : "Réunions du jour"
        }
      >
        <div className="space-y-2">
          {dayModalMeetings.map((meeting) => (
            <MeetingRow
              key={meeting.id}
              meeting={meeting}
              onSelect={() => {
                setDayModalKey(null);
                onEdit(meeting);
              }}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
}
