import type { BadgeTone } from "@/components/ui/Badge";
import type { MeetingStatus } from "@/types/meeting";
import type { ProjectStatus } from "@/types/project";
import type { TaskPriority } from "@/types/task";


interface BadgeInfo {
  label: string;
  tone: BadgeTone;
}

export function projectStatusInfo(status: ProjectStatus): BadgeInfo {
  switch (status) {
    case "active":
      return { label: "Actif", tone: "blue" };
    case "completed":
      return { label: "Terminé", tone: "green" };
    case "archived":
      return { label: "Archivé", tone: "gray" };
    default:
      return { label: status, tone: "gray" };
  }
}

export function taskStatusInfo(status: string): BadgeInfo {
  const s = status?.trim().toLowerCase();
  if (s === "todo") return { label: "À faire", tone: "gray" };
  if (s === "doing") return { label: "En cours", tone: "blue" };
  if (s === "done") return { label: "Terminé", tone: "green" };
  return { label: "Inconnu", tone: "gray" };
}

export function taskPriorityInfo(priority: TaskPriority): BadgeInfo {
  switch (priority) {
    case "high":
      return { label: "Élevée", tone: "red" };
    case "medium":
      return { label: "Moyenne", tone: "orange" };
    case "low":
      return { label: "Faible", tone: "gray" };
    default:
      return { label: priority, tone: "gray" };
  }
}

export function meetingStatusInfo(status: MeetingStatus): BadgeInfo {
  switch (status) {
    case "planned":
      return { label: "Planifiée", tone: "blue" };
    case "completed":
      return { label: "Terminée", tone: "green" };
    case "cancelled":
      return { label: "Annulée", tone: "red" };
    default:
      return { label: status, tone: "gray" };
  }
}

