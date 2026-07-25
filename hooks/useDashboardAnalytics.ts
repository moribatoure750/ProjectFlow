"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardAnalytics } from "@/services/dashboard-analytics.service";
import type { DashboardAnalytics } from "@/types/dashboard-analytics";
import type { MeetingWithProject } from "@/types/meeting";
import type { Project } from "@/types/project";
import type { TaskWithProject } from "@/types/task";

export interface UseDashboardAnalyticsResult {
  projects: Project[];
  tasks: TaskWithProject[];
  meetings: MeetingWithProject[];
  analytics: DashboardAnalytics | null;
  /** `true` uniquement avant la fin du tout premier chargement — le
   *  skeleton complet de la page ne doit s'afficher que dans ce cas. */
  loading: boolean;
  /** `true` pendant un rechargement manuel (`refetch`) *après* le
   *  premier chargement — les données actuelles restent affichées,
   *  seul un petit spinner doit apparaître (jamais de skeleton). */
  refreshing: boolean;
  hasPartialFailure: boolean;
  hasCriticalFailure: boolean;
  refetch: () => void;
}

/**
 * Source unique des données du Dashboard (Lot 11) : remplace les
 * anciens `useState`/`useEffect` locaux de `app/(app)/page.tsx`, qui
 * chargeaient déjà `projects`/`tasks`/`meetings` séparément. Ce hook
 * devient le seul point de fetch de la page — aucune requête dupliquée.
 *
 * Pas de polling (contrairement à `useNotifications`) : les analytics
 * ne sont pas urgentes. Fetch au montage + rafraîchissement manuel via
 * `refetch` (bouton "Actualiser" du `PageHeader`).
 */
export function useDashboardAnalytics(): UseDashboardAnalyticsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithProject[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPartialFailure, setHasPartialFailure] = useState(false);
  const [hasCriticalFailure, setHasCriticalFailure] = useState(false);

  const isFetchingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchAnalytics = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (hasLoadedOnceRef.current) {
      setRefreshing(true);
    }

    try {
      const result = await getDashboardAnalytics();
      setProjects(result.projects);
      setTasks(result.tasks);
      setMeetings(result.meetings);
      setAnalytics(result.analytics);
      setHasPartialFailure(result.hasPartialFailure);
      setHasCriticalFailure(result.hasCriticalFailure);
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnceRef.current = true;
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    projects,
    tasks,
    meetings,
    analytics,
    loading,
    refreshing,
    hasPartialFailure,
    hasCriticalFailure,
    refetch: fetchAnalytics,
  };
}
