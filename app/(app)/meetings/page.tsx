"use client";

import { useEffect, useMemo, useState } from "react";
import { MeetingCalendar } from "@/components/meetings/MeetingCalendar";
import { MeetingFormModal } from "@/components/meetings/MeetingFormModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  ListIcon,
  MapPinIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/ui/icons";


import { meetingStatusInfo } from "@/lib/badge-tones";
import {
  daysBetween,
  formatTimeRange,
  groupMeetingsByDay,
  isMeetingInProgress,
  isStartingSoon,
} from "@/lib/meeting-grouping";

import { cn } from "@/lib/utils";
import {
  deleteMeeting,
  getMeetings,
  updateMeetingStatus,
} from "@/services/meetings.service";
import { getProjects } from "@/services/projects.service";
import type { Project } from "@/types/project";
import type { MeetingStatus, MeetingWithProject } from "@/types/meeting";

type ProjectFilter = "all" | string;
type StatusFilter = "all" | MeetingStatus;
type PeriodFilter = "all" | "today" | "week" | "upcoming" | "past";
type MeetingsView = "agenda" | "calendar";


/** Les trois statuts possibles, dans l'ordre où ils sont proposés dans le
 * menu d'actions (l'option correspondant au statut actuel est masquée au
 * site d'appel). */
const ALL_STATUSES: MeetingStatus[] = ["planned", "completed", "cancelled"];

/** Discreet danger action for the card menu — même convention que
 * app/tasks/page.tsx et app/projects/page.tsx : identifiable sans
 * dominer visuellement le menu. */
const dangerMenuItemClasses =
  "text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-100/10 focus-visible:bg-danger-50 dark:focus-visible:bg-danger-100/10";

function SkeletonMeetingCard() {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <LoadingSkeleton className="h-4 w-1/2" />
        <LoadingSkeleton className="h-5 w-20 rounded-full" />
      </div>
      <LoadingSkeleton className="h-5 w-32 rounded-full" />
      <LoadingSkeleton className="h-3 w-40" />
    </Card>
  );
}

function SkeletonMeetingGroup() {
  return (
    <div>
      <LoadingSkeleton className="mb-3 h-5 w-32" />
      <div className="space-y-3 border-l-2 border-border/60 pl-4 sm:pl-6">
        <SkeletonMeetingCard />
        <SkeletonMeetingCard />
      </div>
    </div>
  );
}

interface MeetingCardProps {
  meeting: MeetingWithProject;
  inProgress: boolean;
  soon: boolean;
  menuOpen: boolean;

  isUpdating: boolean;
  onToggleMenu: () => void;
  onEdit: (meeting: MeetingWithProject) => void;
  onChangeStatus: (meeting: MeetingWithProject, status: MeetingStatus) => void;
  onDelete: (meeting: MeetingWithProject) => void;
}

/**
 * MeetingCard — carte agenda pour une réunion : heure, titre, projet,
 * statut, lieu, lien de visio et menu d'actions (Modifier, changement de
 * statut, Supprimer). Le menu suit exactement le pattern de
 * app/tasks/page.tsx : déclencheur `MoreVerticalIcon`/`Spinner`,
 * `role="menu"`, fermeture au clic extérieur/Escape gérée au niveau page.
 */
function MeetingCard({
  meeting,
  inProgress,
  soon,
  menuOpen,

  isUpdating,
  onToggleMenu,
  onEdit,
  onChangeStatus,
  onDelete,
}: MeetingCardProps) {
  const statusInfo = meetingStatusInfo(meeting.status);

  return (
    <Card
      hoverable
      className={cn(
        "relative p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5",
        isUpdating && "opacity-60"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <ClockIcon className="h-4 w-4 text-fg-subtle" />
          {formatTimeRange(meeting.starts_at, meeting.ends_at)}
        </p>
        <div className="flex items-center gap-1.5">
          {inProgress && <Badge tone="blue">En cours</Badge>}
          {soon && <Badge tone="orange">Commence bientôt</Badge>}
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>

          <button
            onClick={onToggleMenu}
            disabled={isUpdating}
            aria-label="Actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-md p-1 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdating ? (
              <Spinner size="sm" />
            ) : (
              <MoreVerticalIcon className="h-4 w-4" />
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-3 top-9 z-20 w-52 rounded-lg border border-border bg-surface py-1 shadow-lg"
            >
              <button
                role="menuitem"
                onClick={() => onEdit(meeting)}
                className="block w-full px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:bg-surface-hover focus-visible:text-fg"
              >
                Modifier
              </button>
              <div className="my-1 border-t border-border" />
              {ALL_STATUSES.filter((s) => s !== meeting.status).map((s) => (
                <button
                  key={s}
                  role="menuitem"
                  onClick={() => onChangeStatus(meeting, s)}
                  className="block w-full px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:bg-surface-hover focus-visible:text-fg"
                >
                  Marquer comme {meetingStatusInfo(s).label.toLowerCase()}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                role="menuitem"
                onClick={() => onDelete(meeting)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm focus:outline-none",
                  dangerMenuItemClasses
                )}
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-2 break-words font-medium leading-snug text-fg">
        {meeting.title}
      </h3>

      {meeting.description && (
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
          {meeting.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-sm text-fg-muted">
        {meeting.projects?.title && (
          <Badge tone="purple">{meeting.projects.title}</Badge>
        )}
        {meeting.location && (
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4 text-fg-subtle" />
            {meeting.location}
          </span>
        )}
        {meeting.meeting_url && (
          <a
            href={meeting.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md text-info-600 transition-colors duration-150 hover:text-info-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <VideoIcon className="h-4 w-4" />
            Rejoindre
          </a>
        )}
      </div>
    </Card>
  );
}

export default function MeetingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const [view, setView] = useState<MeetingsView>("agenda");
  const [pastExpanded, setPastExpanded] = useState(false);


  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithProject | null>(
    null
  );

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<MeetingWithProject | null>(
    null
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  async function loadProjects() {
    const { data, error } = await getProjects();
    if (error) {
      alert(error.message);
      return;
    }
    setProjects(data);
  }

  async function loadMeetings() {
    setLoading(true);
    const { data, error } = await getMeetings();
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }
    setMeetings(data);
  }

  useEffect(() => {
    function runInitialLoad() {
      loadProjects();
      loadMeetings();
    }
    runInitialLoad();
  }, []);

  /** Fermeture du menu d'actions au clavier (Escape), même pattern que
   * app/tasks/page.tsx. Sans conflit avec la modal de suppression, qui a
   * son propre écouteur Escape indépendant dans Modal.tsx. */
  useEffect(() => {
    if (!openMenuId) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openMenuId]);

  function resetFilters() {
    setSearch("");
    setProjectFilter("all");
    setStatusFilter("all");
    setPeriodFilter("all");
  }

  const hasActiveFilters =
    search !== "" ||
    projectFilter !== "all" ||
    statusFilter !== "all" ||
    periodFilter !== "all";

  function openCreateModal() {
    setEditingMeeting(null);
    setModalOpen(true);
  }

  function openEditModal(meeting: MeetingWithProject) {
    setOpenMenuId(null);
    setEditingMeeting(meeting);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function changeStatus(meeting: MeetingWithProject, status: MeetingStatus) {
    setOpenMenuId(null);
    setStatusUpdatingId(meeting.id);
    const { error } = await updateMeetingStatus(meeting.id, status);
    setStatusUpdatingId(null);

    if (error) {
      alert(error.message);
      return;
    }
    loadMeetings();
  }

  function openDeleteModal(meeting: MeetingWithProject) {
    setOpenMenuId(null);
    setDeleteTarget(meeting);
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);
    const { error } = await deleteMeeting(deleteTarget.id);
    setDeleteSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Réunion supprimée !");
    setDeleteTarget(null);
    loadMeetings();
  }

  const now = useMemo(() => new Date(), []);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const query = search.toLowerCase();
      const matchesSearch =
        meeting.title.toLowerCase().includes(query) ||
        (meeting.description ?? "").toLowerCase().includes(query) ||
        (meeting.projects?.title ?? "").toLowerCase().includes(query) ||
        (meeting.location ?? "").toLowerCase().includes(query);
      const matchesProject =
        projectFilter === "all" || meeting.project_id === projectFilter;
      const matchesStatus =
        statusFilter === "all" || meeting.status === statusFilter;

      let matchesPeriod = true;
      if (periodFilter !== "all") {
        const start = new Date(meeting.starts_at);
        const diff = daysBetween(now, start);
        if (periodFilter === "today") matchesPeriod = diff === 0;
        else if (periodFilter === "week") matchesPeriod = diff >= 0 && diff < 7;
        else if (periodFilter === "upcoming") matchesPeriod = diff >= 0;
        else if (periodFilter === "past") matchesPeriod = diff < 0;
      }

      return matchesSearch && matchesProject && matchesStatus && matchesPeriod;
    });
  }, [meetings, search, projectFilter, statusFilter, periodFilter, now]);

  /** Sépare les réunions à venir (aujourd'hui inclus) des réunions passées,
   * pour que l'agenda mette l'avenir en avant (voir proposition validée). */
  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const upcoming: MeetingWithProject[] = [];
    const past: MeetingWithProject[] = [];

    for (const meeting of filteredMeetings) {
      const diff = daysBetween(now, new Date(meeting.starts_at));
      if (diff < 0) past.push(meeting);
      else upcoming.push(meeting);
    }

    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [filteredMeetings, now]);

  const upcomingGroups = useMemo(
    () => groupMeetingsByDay(upcomingMeetings, now),
    [upcomingMeetings, now]
  );
  const pastGroups = useMemo(
    () => groupMeetingsByDay(pastMeetings, now),
    [pastMeetings, now]
  );

  return (
    <div>
      <PageHeader
        title="Réunions"
        description="Organisez et suivez les réunions de vos projets"
        actions={
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={openCreateModal}
          >
            Nouvelle réunion
          </Button>
        }
      />

      {!loading && meetings.length > 0 && (
        <div
          role="tablist"
          aria-label="Mode d'affichage des réunions"
          className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "agenda"}
            onClick={() => setView("agenda")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === "agenda"
                ? "bg-accent text-accent-foreground"
                : "text-fg-muted hover:text-fg"
            )}
          >
            <ListIcon className="h-4 w-4" />
            Agenda
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "calendar"}
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === "calendar"
                ? "bg-accent text-accent-foreground"
                : "text-fg-muted hover:text-fg"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            Calendrier
          </button>
        </div>
      )}

      {!loading && meetings.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">

          <Input
            icon={<SearchIcon className="h-4 w-4" />}
            placeholder="Rechercher une réunion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="sm:w-48"
          >
            <option value="all">Tous les projets</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="sm:w-44"
          >
            <option value="all">Tous les statuts</option>
            <option value="planned">Planifiée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </Select>

          {view === "agenda" && (
            <Select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="sm:w-44"
            >
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="week">Cette semaine</option>
              <option value="upcoming">À venir</option>
              <option value="past">Passées</option>
            </Select>
          )}


          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          <SkeletonMeetingGroup />
          <SkeletonMeetingGroup />
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-10 w-10" />}
          title="Aucune réunion pour le moment"
          description="Les réunions de vos projets apparaîtront ici, organisées par jour."
        />
      ) : filteredMeetings.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-10 w-10" />}
          title="Aucun résultat"
          description="Essayez de modifier vos filtres de recherche."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : view === "calendar" ? (
        <MeetingCalendar meetings={filteredMeetings} onEdit={openEditModal} />
      ) : (
        <div className="space-y-8">

          {upcomingGroups.length === 0 && pastGroups.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="h-10 w-10" />}
              title="Aucun résultat"
              description="Essayez de modifier vos filtres de recherche."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              }
            />
          ) : (
            <>
              {upcomingGroups.map((group) => (
                <section key={group.key}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h2 className="flex items-center gap-1.5 font-semibold text-fg">
                      <CalendarIcon className="h-4 w-4 text-fg-subtle" />
                      {group.label}
                    </h2>
                    <span className="text-xs capitalize text-fg-subtle">
                      · {group.fullDate}
                    </span>
                  </div>

                  <div className="space-y-3 border-l-2 border-border pl-4 sm:pl-6">
                    {group.meetings.map((meeting) => (
                      <div key={meeting.id} className="relative">
                        <span
                          aria-hidden="true"
                          className="absolute -left-[21px] top-4 hidden h-2.5 w-2.5 rounded-full bg-accent sm:-left-[29px] sm:block"
                        />
                        <MeetingCard
                          meeting={meeting}
                          inProgress={isMeetingInProgress(meeting, now)}
                          soon={
                            !isMeetingInProgress(meeting, now) &&
                            meeting.status === "planned" &&
                            isStartingSoon(meeting.starts_at, now)
                          }
                          menuOpen={openMenuId === meeting.id}

                          isUpdating={statusUpdatingId === meeting.id}
                          onToggleMenu={() =>
                            setOpenMenuId(
                              openMenuId === meeting.id ? null : meeting.id
                            )
                          }
                          onEdit={openEditModal}
                          onChangeStatus={changeStatus}
                          onDelete={openDeleteModal}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {pastGroups.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setPastExpanded((v) => !v)}
                    aria-expanded={pastExpanded}
                    className="mb-3 flex items-center gap-1.5 rounded-md font-semibold text-fg-muted transition-colors duration-150 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 transition-transform duration-150",
                        !pastExpanded && "-rotate-90"
                      )}
                    />
                    Réunions passées
                    <Badge tone="gray">{pastMeetings.length}</Badge>
                  </button>

                  {pastExpanded && (
                    <div className="space-y-8">
                      {pastGroups.map((group) => (
                        <div key={group.key}>
                          <div className="mb-3 flex items-baseline gap-2">
                            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
                              <CalendarIcon className="h-4 w-4 text-fg-subtle" />
                              {group.fullDate}
                            </h3>
                          </div>
                          <div className="space-y-3 border-l-2 border-border/60 pl-4 opacity-80 sm:pl-6">
                            {group.meetings.map((meeting) => (
                              <div key={meeting.id} className="relative">
                                <span
                                  aria-hidden="true"
                                  className="absolute -left-[21px] top-4 hidden h-2.5 w-2.5 rounded-full bg-fg-subtle sm:-left-[29px] sm:block"
                                />
                                <MeetingCard
                                  meeting={meeting}
                                  inProgress={false}
                                  soon={false}
                                  menuOpen={openMenuId === meeting.id}

                                  isUpdating={statusUpdatingId === meeting.id}
                                  onToggleMenu={() =>
                                    setOpenMenuId(
                                      openMenuId === meeting.id
                                        ? null
                                        : meeting.id
                                    )
                                  }
                                  onEdit={openEditModal}
                                  onChangeStatus={changeStatus}
                                  onDelete={openDeleteModal}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}

      <MeetingFormModal
        key={editingMeeting?.id ?? "create"}
        open={modalOpen}
        onClose={closeModal}
        editingMeeting={editingMeeting}
        projects={projects}
        onSuccess={loadMeetings}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="Supprimer la réunion"
        variant="danger"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={deleteSubmitting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deleteSubmitting}
            >
              Supprimer
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="font-semibold text-fg">{deleteTarget.title}</p>
            <p className="flex items-center gap-1.5 text-sm text-fg-muted">
              <ClockIcon className="h-4 w-4 text-fg-subtle" />
              {formatTimeRange(deleteTarget.starts_at, deleteTarget.ends_at)}
            </p>
            {deleteTarget.projects?.title && (
              <Badge tone="purple">{deleteTarget.projects.title}</Badge>
            )}
            <p className="text-sm text-fg-muted">
              Voulez-vous vraiment supprimer cette réunion ? Cette action est
              irréversible.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
