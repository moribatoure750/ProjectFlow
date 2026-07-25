"use client";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast } from "@/components/ui/Toast";
import { InboxIcon } from "@/components/ui/icons";
import { useNotifications } from "@/hooks/useNotifications";
import { groupNotificationsByCategory } from "@/lib/notification-grouping";
import { notificationCategoryInfo } from "@/lib/notification-meta";

function SkeletonSection() {
  return (
    <Card className="p-5">
      <LoadingSkeleton className="mb-4 h-5 w-40" />
      <div className="space-y-3">
        <LoadingSkeleton className="h-14 w-full" />
        <LoadingSkeleton className="h-14 w-full" />
      </div>
    </Card>
  );
}

/**
 * Centre de notifications (Lot 10A) — page complète, regroupée par
 * catégorie dans l'ordre d'urgence. Aucune donnée persistée ici :
 * `useNotifications()` recalcule tout à chaque chargement à partir de
 * `projects`/`tasks`/`meetings.service.ts`.
 */
export default function NotificationsPage() {
  const { notifications, loading, hasPartialFailure } = useNotifications();
  const groups = groupNotificationsByCategory(notifications);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alertes calculées à partir de vos projets, tâches et réunions."
      />

      {hasPartialFailure && (
        <div className="mb-6">
          <Toast variant="warning">
            Certaines données n&apos;ont pas pu être chargées. Les
            notifications affichées peuvent être incomplètes.
          </Toast>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <SkeletonSection />
          <SkeletonSection />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="Tout est sous contrôle 🎉"
          description="Aucune alerte pour le moment : vos tâches, réunions et projets sont à jour."
        />
      ) : (
        <div className="space-y-6">
          {groups.map(({ category, items }) => {
            const { label } = notificationCategoryInfo(category);
            return (
              <Card key={category} className="animate-fade-in p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-fg">{label}</h2>
                  <span className="text-xs text-fg-subtle">
                    {items.length} {items.length > 1 ? "alertes" : "alerte"}
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
