"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getNotifications } from "@/services/notifications.service";
import type { AppNotification } from "@/types/notification";

/** Polling léger, uniquement si l'onglet est visible — pas de temps
 *  réel nécessaire : les règles de notification reposent sur des dates
 *  journalières, jamais sur des événements instantanés. */
const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes maximum

export interface UseNotificationsResult {
  notifications: AppNotification[];
  loading: boolean;
  /** `true` si au moins une des trois sources n'a pas pu être chargée
   *  lors du dernier calcul (voir `GetNotificationsResult`). */
  hasPartialFailure: boolean;
  /** Relance un calcul (ex: à l'ouverture du dropdown). Sans effet si un
   *  fetch est déjà en cours (`isFetchingRef`), pour éviter deux appels
   *  concurrents (ex: polling + ouverture manuelle simultanés). */
  refetch: () => void;
}

/**
 * Centralise le calcul des notifications (Lot 10A) pour que le
 * compteur du `NotificationBell` (Header) soit disponible sans ouvrir
 * le dropdown, et pour que le dropdown et la page `/notifications` ne
 * dupliquent pas la logique de fetch.
 *
 * Pas de Context/Provider global (même choix que `Toast` au Lot 9) :
 * ce hook n'est instancié qu'une seule fois, dans `NotificationBell`,
 * monté une seule fois par le Header du layout `(app)` — la page
 * `/notifications` l'instancie une seconde fois (fetch indépendant),
 * ce qui reste acceptable au vu du faible volume de données.
 *
 * Rafraîchissement : au montage, au retour de visibilité de l'onglet,
 * et polling toutes les 5 minutes maximum, uniquement si l'onglet est
 * visible à ce moment-là.
 */
export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPartialFailure, setHasPartialFailure] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, hasPartialFailure: partial } = await getNotifications();
      setNotifications(data);
      setHasPartialFailure(partial);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  return { notifications, loading, hasPartialFailure, refetch: fetchNotifications };
}
