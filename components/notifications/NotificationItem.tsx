import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { notificationCategoryInfo } from "@/lib/notification-meta";
import type { AppNotification } from "@/types/notification";

export interface NotificationItemProps {
  notification: AppNotification;
  /** Appelé après navigation — utilisé par `NotificationBell` pour
   *  fermer le dropdown au clic sur un lien. */
  onNavigate?: () => void;
}

/**
 * Ligne de notification, réutilisée à l'identique par le dropdown du
 * `NotificationBell` et par la page `/notifications`.
 *
 * Chaque catégorie reste identifiable sans dépendre uniquement de la
 * couleur : icône + libellé texte (`Badge`) + couleur.
 */
export function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const { label, tone, icon: Icon } = notificationCategoryInfo(notification.category);

  return (
    <Link
      href={notification.href}
      onClick={onNavigate}
      className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="mt-0.5 shrink-0 text-fg-muted" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{label}</Badge>
          <span className="text-xs text-fg-subtle">{formatDate(notification.date)}</span>
        </div>
        <p className="mt-1 truncate text-sm text-fg">{notification.message}</p>
      </div>
    </Link>
  );
}
