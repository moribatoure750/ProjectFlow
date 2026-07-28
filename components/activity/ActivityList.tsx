import type { Activity } from "@/types/activity";

import { ActivityEmptyState } from "./ActivityEmptyState";
import { ActivityItem } from "./ActivityItem";

export interface ActivityListProps {
  activities: Activity[];
}

/**
 * ActivityList — liste des activités d'une entité (Lot 16A).
 * Volontairement sans recherche/tri (à la différence
 * d'`AttachmentList`) : un journal d'activité est toujours affiché
 * dans l'ordre chronologique inverse déjà appliqué par
 * `services/activity.service.ts` (`getActivities`), sans besoin de
 * réordonnancement côté client dans ce lot.
 */
export function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return <ActivityEmptyState />;
  }

  return (
    <ul className="divide-y divide-border">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </ul>
  );
}
