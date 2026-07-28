"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getActivities } from "@/services/activity.service";
import type { Activity, ActivityEntityType } from "@/types/activity";

export interface UseActivityResult {
  activities: Activity[];
  /** `true` uniquement avant la fin du tout premier chargement — même
   *  choix que `hooks/useAttachments.ts`/`hooks/useNotifications.ts`. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * useActivity — unique point d'accès UI au Lot 16A
 * (services/activity.service.ts). Purement un hook de lecture : aucune
 * logique métier ici (pas de calcul de description, pas de mapping
 * icône/couleur — voir components/activity/ActivityItem.tsx et
 * lib/activity-meta.ts pour ça), uniquement chargement/rafraîchissement
 * et exposition de `loading`/`error`.
 *
 * Volontairement sans Provider/Context, comme `useAttachments()` :
 * chaque page de détail instancie ce hook avec son propre
 * `entityType`/`entityId`.
 */
export function useActivity(
  entityType: ActivityEntityType,
  entityId: string
): UseActivityResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error: fetchError } = await getActivities(entityType, entityId);
      setActivities(data);
      setError(fetchError?.message ?? null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, loading, error, refresh };
}
