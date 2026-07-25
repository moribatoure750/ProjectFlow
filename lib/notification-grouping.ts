import { NOTIFICATION_CATEGORY_ORDER } from "@/services/notifications.service";
import type { AppNotification, NotificationCategory } from "@/types/notification";

export interface NotificationGroup {
  category: NotificationCategory;
  items: AppNotification[];
}

/**
 * Regroupe les notifications par catégorie, dans l'ordre d'urgence
 * défini par `NOTIFICATION_CATEGORY_ORDER` (utilisé par la page
 * `/notifications` uniquement ; le dropdown du `NotificationBell`
 * reste une simple liste plate triée, sans regroupement).
 *
 * Les notifications sont déjà triées par date au sein de chaque
 * catégorie par `computeNotifications()` — un simple `filter` par
 * catégorie préserve donc cet ordre.
 */
export function groupNotificationsByCategory(
  notifications: AppNotification[]
): NotificationGroup[] {
  return NOTIFICATION_CATEGORY_ORDER.map((category) => ({
    category,
    items: notifications.filter((n) => n.category === category),
  })).filter((group) => group.items.length > 0);
}
