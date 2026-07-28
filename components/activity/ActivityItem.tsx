import { Badge } from "@/components/ui/Badge";
import { activityActionInfo, getActivityDescription } from "@/lib/activity-meta";
import { formatDate } from "@/lib/format";
import type { Activity } from "@/types/activity";

export interface ActivityItemProps {
  activity: Activity;
}

/** Heure locale courte (ex. "14:32"), en complément de `formatDate()`
 *  qui ne renvoie que le jour — même précision que
 *  `formatTimeRange()` (lib/meeting-grouping.ts), mais pour un instant
 *  unique plutôt qu'une plage. */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

/**
 * ActivityItem — une ligne du journal d'activité (Lot 16A) : icône,
 * badge d'action, date, heure et description. Purement présentation,
 * sans aucune action possible (pas de suppression/édition — un
 * journal d'activité est immuable, voir supabase/activity_logs.sql).
 *
 * Même structure visuelle que `AttachmentItem`
 * (components/attachments/AttachmentItem.tsx) : icône ronde à gauche,
 * contenu texte à droite, pour rester cohérent avec le Design System.
 */
export function ActivityItem({ activity }: ActivityItemProps) {
  const { label, tone, icon: Icon } = activityActionInfo(activity.action);
  const description = getActivityDescription(activity);
  const time = formatTime(activity.createdAt);

  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-hover text-fg-subtle"
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{label}</Badge>
          <span className="text-xs text-fg-subtle">
            {formatDate(activity.createdAt)}
            {time ? ` · ${time}` : ""}
          </span>
        </div>
        <p className="mt-1 text-sm text-fg">{description}</p>
      </div>
    </li>
  );
}
