"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActivitySection } from "@/components/activity/ActivitySection";
import { AttachmentSection } from "@/components/attachments/AttachmentSection";
import { EntityComingSoon } from "@/components/layout/EntityComingSoon";
import { EntityDetailSkeleton } from "@/components/layout/EntityDetailSkeleton";
import { EntityHeader } from "@/components/layout/EntityHeader";
import { EntityLayout } from "@/components/layout/EntityLayout";
import { EntitySidebar } from "@/components/layout/EntitySidebar";
import { EntityTabs, type EntityTab } from "@/components/layout/EntityTabs";
import { MeetingFormModal } from "@/components/meetings/MeetingFormModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  CalendarIcon,
  ClockIcon,
  FolderIcon,
  HistoryIcon,
  MapPinIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/ui/icons";

import { meetingStatusInfo } from "@/lib/badge-tones";
import { formatDate } from "@/lib/format";
import { formatTimeRange, isMeetingInProgress, isStartingSoon } from "@/lib/meeting-grouping";
import { dangerGhostClasses } from "@/lib/utils";
import {
  deleteMeeting,
  getMeetingById,
  updateMeetingStatus,
} from "@/services/meetings.service";
import { getProjects } from "@/services/projects.service";
import type { MeetingStatus, MeetingWithProject } from "@/types/meeting";
import type { Project } from "@/types/project";

/** Les trois statuts possibles, même liste que app/meetings/page.tsx. */
const ALL_STATUSES: MeetingStatus[] = ["planned", "completed", "cancelled"];

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const meetingId = params.id;
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingWithProject | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("info");

  async function loadData() {
    setLoading(true);
    const [meetingRes, projectsRes] = await Promise.all([
      getMeetingById(meetingId),
      getProjects(),
    ]);
    setLoading(false);

    if (meetingRes.error) {
      alert(meetingRes.error.message);
      return;
    }
    if (!meetingRes.data) {
      setNotFound(true);
      return;
    }
    setMeeting(meetingRes.data);

    if (!projectsRes.error) setProjects(projectsRes.data);
  }

  useEffect(() => {
    function runInitialLoad() {
      loadData();
    }
    runInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function handleChangeStatus(status: MeetingStatus) {
    setStatusSubmitting(true);
    const { error } = await updateMeetingStatus(meetingId, status);
    setStatusSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }
    loadData();
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteOpen(false);
  }

  async function confirmDelete() {
    setDeleteSubmitting(true);
    const { error } = await deleteMeeting(meetingId);
    setDeleteSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Réunion supprimée avec succès !");
    router.push("/meetings");
  }

  if (loading) {
    return (
      <EntityLayout breadcrumbs={[{ label: "Réunions", href: "/meetings" }, { label: "Chargement…" }]}>
        <EntityDetailSkeleton />
      </EntityLayout>
    );
  }

  if (notFound || !meeting) {
    return (
      <EntityLayout breadcrumbs={[{ label: "Réunions", href: "/meetings" }, { label: "Introuvable" }]}>
        <EmptyState
          icon={<UsersIcon className="h-10 w-10" />}
          title="Réunion introuvable"
          description="Cette réunion n'existe pas ou ne vous appartient pas."
          action={
            <Button onClick={() => router.push("/meetings")}>
              Retour aux réunions
            </Button>
          }
        />
      </EntityLayout>
    );
  }

  const statusInfo = meetingStatusInfo(meeting.status);
  const now = new Date();
  const inProgress = isMeetingInProgress(meeting, now);
  const soon = !inProgress && meeting.status === "planned" && isStartingSoon(meeting.starts_at, now);

  const tabs: EntityTab[] = [
    { key: "info", label: "Informations" },
    { key: "attachments", label: "Pièces jointes", icon: PaperclipIcon },
    { key: "comments", label: "Commentaires", icon: MessageSquareIcon },
    { key: "history", label: "Activité", icon: HistoryIcon },
  ];

  return (
    <EntityLayout
      breadcrumbs={[{ label: "Réunions", href: "/meetings" }, { label: meeting.title }]}
    >
      <EntityHeader
        title={meeting.title}
        badge={
          <div className="flex items-center gap-1.5">
            {inProgress && <Badge tone="blue">En cours</Badge>}
            {soon && <Badge tone="orange">Commence bientôt</Badge>}
            <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
          </div>
        }
        backHref="/meetings"
        backLabel="Retour aux réunions"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<PencilIcon className="h-3.5 w-3.5" />}
              onClick={() => setModalOpen(true)}
            >
              Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<TrashIcon className="h-3.5 w-3.5" />}
              onClick={() => setDeleteOpen(true)}
              className={dangerGhostClasses}
            >
              Supprimer
            </Button>
          </>
        }
      />

      <EntityTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {activeTab === "info" && (
            <>
              <Card className="p-5">
                <h2 className="mb-2 text-base font-semibold text-fg">Description</h2>
                <p className="whitespace-pre-wrap text-sm text-fg-muted">
                  {meeting.description || "Aucune description."}
                </p>
              </Card>

              <Card className="mt-6 p-5">
                <h2 className="mb-3 text-base font-semibold text-fg">
                  Changer le statut
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ALL_STATUSES.map((status) => {
                    const isCurrent = status === meeting.status;
                    const info = meetingStatusInfo(status);
                    return (
                      <Button
                        key={status}
                        variant={isCurrent ? "primary" : "secondary"}
                        size="sm"
                        disabled={isCurrent || statusSubmitting}
                        onClick={() => handleChangeStatus(status)}
                      >
                        {info.label}
                      </Button>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

          {activeTab === "attachments" && (
            <AttachmentSection entityType="meeting" entityId={meetingId} />
          )}
          {activeTab === "comments" && (
            <EntityComingSoon
              icon={<MessageSquareIcon className="h-6 w-6" />}
              title="Commentaires"
            />
          )}
          {activeTab === "history" && (
            <ActivitySection entityType="meeting" entityId={meetingId} />
          )}
        </div>

        <div className="space-y-6">
          <EntitySidebar>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Projet
                </p>
                {meeting.projects?.title ? (
                  <Link
                    href={`/projects/${meeting.project_id}`}
                    className="inline-flex items-center gap-1.5 font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
                  >
                    <FolderIcon className="h-4 w-4" />
                    {meeting.projects.title}
                  </Link>
                ) : (
                  <span className="text-fg-muted">Sans projet</span>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Date
                </p>
                <p className="flex items-center gap-1.5 font-medium text-fg">
                  <CalendarIcon className="h-4 w-4 text-fg-subtle" />
                  {formatDate(meeting.starts_at)}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Horaire
                </p>
                <p className="flex items-center gap-1.5 font-medium text-fg">
                  <ClockIcon className="h-4 w-4 text-fg-subtle" />
                  {formatTimeRange(meeting.starts_at, meeting.ends_at)}
                </p>
              </div>

              {meeting.location && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                    Lieu
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-fg">
                    <MapPinIcon className="h-4 w-4 text-fg-subtle" />
                    {meeting.location}
                  </p>
                </div>
              )}

              {meeting.meeting_url && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                    Visioconférence
                  </p>
                  <a
                    href={meeting.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-medium text-info-600 transition-colors duration-150 hover:text-info-700"
                  >
                    <VideoIcon className="h-4 w-4" />
                    Rejoindre la réunion
                  </a>
                </div>
              )}
            </div>
          </EntitySidebar>
        </div>
      </div>

      <MeetingFormModal
        key={meeting.id}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingMeeting={meeting}
        projects={projects}
        onSuccess={loadData}
      />

      <Modal
        open={deleteOpen}
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
        <p className="text-sm text-fg-muted">
          Voulez-vous vraiment supprimer la réunion{" "}
          <span className="font-semibold text-fg">{meeting.title}</span> ? Cette
          action est irréversible.
        </p>
      </Modal>
    </EntityLayout>
  );
}
