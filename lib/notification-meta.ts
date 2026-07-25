import type { ComponentType, SVGProps } from "react";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  AlertTriangleIcon,
  ClockIcon,
  TargetIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { NotificationCategory } from "@/types/notification";

/**
 * Mapping catégorie de notification → présentation (libellé, couleur du
 * Design System, icône), sur le même modèle que `lib/badge-tones.ts`.
 * Garde `types/notification.ts` et `services/notifications.service.ts`
 * strictement centrés sur les données, jamais sur l'UI.
 *
 * Chaque catégorie reste identifiable même sans couleur (icône +
 * libellé texte distincts), pour l'accessibilité (daltonisme, etc.).
 */
interface NotificationCategoryInfo {
  label: string;
  tone: BadgeTone;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export function notificationCategoryInfo(
  category: NotificationCategory
): NotificationCategoryInfo {
  switch (category) {
    case "task_overdue":
      return { label: "Tâche en retard", tone: "red", icon: AlertTriangleIcon };
    case "task_due_today":
      return { label: "Tâche due aujourd'hui", tone: "orange", icon: ClockIcon };
    case "meeting_today":
      return { label: "Réunion aujourd'hui", tone: "blue", icon: UsersIcon };
    case "project_deadline":
      return { label: "Échéance de projet proche", tone: "purple", icon: TargetIcon };
    case "task_due_soon":
      return { label: "Tâche bientôt due", tone: "gray", icon: ClockIcon };
    default:
      return { label: category, tone: "gray", icon: ClockIcon };
  }
}
