"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { createMeeting, updateMeeting } from "@/services/meetings.service";
import type { Project } from "@/types/project";
import type { MeetingWithProject } from "@/types/meeting";

interface MeetingFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Réunion à modifier, ou `null` pour une création. */
  editingMeeting: MeetingWithProject | null;
  projects: Project[];
  /** Appelé après un succès (création ou modification), pour que la page
   * parente recharge la liste des réunions. */
  onSuccess: () => void;
}

/** Découpe une date ISO en composantes locales "YYYY-MM-DD" / "HH:MM",
 * utilisées pour pré-remplir les champs `date`/`time`. Les getters
 * locaux (`getFullYear`, `getHours`, ...) sont utilisés volontairement,
 * jamais les variantes `UTC*`, pour refléter l'heure vue par
 * l'utilisateur (le navigateur convertit déjà l'UTC stocké). */
function toLocalDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };

  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

/** Construit une Date à partir de composantes locales "YYYY-MM-DD" et
 * "HH:MM". Utilise le constructeur numérique du navigateur (jamais une
 * chaîne concaténée passée à `new Date(str)`), qui interprète toujours
 * ces composantes comme l'heure locale — sans ambiguïté de fuseau. */
function buildLocalDate(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, y, m, d] = dateMatch;
  const [, h, min] = timeMatch;
  const result = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(h),
    Number(min)
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

/** `true` si la chaîne est une URL http/https valide. Chaîne vide = valide
 * (champ optionnel), la validation "requis" est gérée séparément. */
function isValidMeetingUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function MeetingFormModal({
  open,
  onClose,
  editingMeeting,
  projects,
  onSuccess,
}: MeetingFormModalProps) {
  const isEditing = editingMeeting !== null;

  /**
   * Initialisation directe à partir des props (pas de `useEffect` +
   * `setState`, ce qui provoquerait des rendus en cascade). Le parent
   * démonte/remonte ce composant à chaque ouverture (voir `key` posée
   * sur `<MeetingFormModal>` dans app/meetings/page.tsx), donc ces
   * valeurs par défaut ne sont calculées qu'une fois par ouverture,
   * fraîches pour la réunion éditée ou vides pour une création.
   */
  const initialStart = editingMeeting
    ? toLocalDateAndTime(editingMeeting.starts_at)
    : { date: "", time: "" };
  const initialEnd = editingMeeting
    ? toLocalDateAndTime(editingMeeting.ends_at)
    : { date: "", time: "" };

  const [projectId, setProjectId] = useState(
    editingMeeting?.project_id ?? ""
  );
  const [title, setTitle] = useState(editingMeeting?.title ?? "");
  const [description, setDescription] = useState(
    editingMeeting?.description ?? ""
  );
  const [date, setDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [location, setLocation] = useState(editingMeeting?.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(
    editingMeeting?.meeting_url ?? ""
  );
  const [submitting, setSubmitting] = useState(false);


  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function isFormValid(): { startDate: Date; endDate: Date } | null {
    if (!projectId) {
      alert("Choisis un projet.");
      return null;
    }
    if (!title.trim()) {
      alert("Le titre de la réunion est obligatoire.");
      return null;
    }
    if (!date) {
      alert("La date est obligatoire.");
      return null;
    }
    if (!startTime) {
      alert("L'heure de début est obligatoire.");
      return null;
    }
    if (!endTime) {
      alert("L'heure de fin est obligatoire.");
      return null;
    }

    const startDate = buildLocalDate(date, startTime);
    const endDate = buildLocalDate(date, endTime);

    if (!startDate || !endDate) {
      alert("Date ou heure invalide.");
      return null;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      alert("L'heure de fin doit être postérieure à l'heure de début.");
      return null;
    }

    if (!isValidMeetingUrl(meetingUrl)) {
      alert("Le lien de visioconférence doit être une URL http ou https valide.");
      return null;
    }

    return { startDate, endDate };
  }

  async function handleSubmit() {
    const validated = isFormValid();
    if (!validated) return;

    const { startDate, endDate } = validated;
    const payload = {
      project_id: projectId,
      title,
      description,
      location,
      meeting_url: meetingUrl,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
    };

    setSubmitting(true);
    const { error } = editingMeeting
      ? await updateMeeting(editingMeeting.id, payload)
      : await createMeeting({ ...payload, status: "planned" });
    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      editingMeeting
        ? "Réunion mise à jour avec succès !"
        : "Réunion créée avec succès !"
    );
    onSuccess();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? "Modifier la réunion" : "Nouvelle réunion"}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEditing ? "Mettre à jour" : "Créer la réunion"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="meeting-project"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Projet associé
          </label>
          <Select
            id="meeting-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Choisir un projet</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor="meeting-title"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Titre de la réunion
          </label>
          <Input
            id="meeting-title"
            placeholder="Exemple : Sprint Planning"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="meeting-description"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Description
          </label>
          <Textarea
            id="meeting-description"
            placeholder="Décrire brièvement l'objet de la réunion"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="meeting-date"
              className="mb-1.5 block text-sm font-medium text-fg"
            >
              Date
            </label>
            <Input
              id="meeting-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="meeting-start-time"
              className="mb-1.5 block text-sm font-medium text-fg"
            >
              Heure de début
            </label>
            <Input
              id="meeting-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="meeting-end-time"
              className="mb-1.5 block text-sm font-medium text-fg"
            >
              Heure de fin
            </label>
            <Input
              id="meeting-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="meeting-location"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Lieu
          </label>
          <Input
            id="meeting-location"
            placeholder="Exemple : Salle A"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="meeting-url"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Lien de visioconférence
          </label>
          <Input
            id="meeting-url"
            type="url"
            placeholder="https://..."
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
    </Modal>
  );
}
