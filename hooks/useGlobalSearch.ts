"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMeetings } from "@/services/meetings.service";
import { getProjects } from "@/services/projects.service";
import { getTasks } from "@/services/tasks.service";
import { searchEntities } from "@/services/search.service";
import type { MeetingWithProject } from "@/types/meeting";
import type { Project } from "@/types/project";
import type { SearchResult } from "@/types/search";
import type { TaskWithProject } from "@/types/task";

/** Léger debounce de précaution — le scoring reste synchrone et bon
 *  marché (volume de données personnel), ce délai évite seulement des
 *  recalculs inutiles à chaque frappe très rapide. */
const DEBOUNCE_MS = 120;

export type GlobalSearchStatus = "idle" | "loading" | "ready" | "error";

interface GlobalSearchData {
  projects: Project[];
  tasks: TaskWithProject[];
  meetings: MeetingWithProject[];
}

const EMPTY_DATA: GlobalSearchData = { projects: [], tasks: [], meetings: [] };

export interface UseGlobalSearchResult {
  /** Résultats déjà scorés/triés/plafonnés par `searchEntities()`. */
  results: SearchResult[];
  status: GlobalSearchStatus;
  /** `true` si une ou deux des trois sources ont échoué lors du
   *  dernier chargement (au moins une a réussi). */
  hasPartialFailure: boolean;
  /** Charge les 3 sources si ce n'est pas déjà fait (idempotent) — à
   *  appeler à la première ouverture de la palette. Tant que
   *  l'AppShell reste monté, les données restent en mémoire et ne
   *  sont jamais rechargées automatiquement à chaque ouverture. */
  ensureLoaded: () => void;
  /** Invalide le cache et recharge — API prête pour un futur lot
   *  (invalidation après création/modification d'un projet, d'une
   *  tâche ou d'une réunion), inutilisée pour l'instant. */
  refresh: () => void;
}

/**
 * Recherche globale (Lot 12) — charge une seule fois par session les
 * mêmes 3 sources que le Dashboard (Lot 11), puis délègue tout le
 * scoring à `searchEntities()` (fonction pure). Ce hook ne contient
 * aucune règle de matching : il orchestre uniquement le chargement et
 * le debounce de la requête tapée.
 */
export function useGlobalSearch(query: string): UseGlobalSearchResult {
  const [status, setStatus] = useState<GlobalSearchStatus>("idle");
  const [hasPartialFailure, setHasPartialFailure] = useState(false);
  const [data, setData] = useState<GlobalSearchData>(EMPTY_DATA);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const load = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setStatus("loading");

    const [projectsResult, tasksResult, meetingsResult] = await Promise.allSettled([
      getProjects({ orderByCreatedAtDesc: true }),
      getTasks(),
      getMeetings(),
    ]);

    let successCount = 0;
    let projects: Project[] = [];
    let tasks: TaskWithProject[] = [];
    let meetings: MeetingWithProject[] = [];

    if (projectsResult.status === "fulfilled" && !projectsResult.value.error) {
      projects = projectsResult.value.data;
      successCount += 1;
    }
    if (tasksResult.status === "fulfilled" && !tasksResult.value.error) {
      tasks = tasksResult.value.data;
      successCount += 1;
    }
    if (meetingsResult.status === "fulfilled" && !meetingsResult.value.error) {
      meetings = meetingsResult.value.data;
      successCount += 1;
    }

    setData({ projects, tasks, meetings });
    setHasPartialFailure(successCount > 0 && successCount < 3);
    setStatus(successCount > 0 ? "ready" : "error");
    isFetchingRef.current = false;
  }, []);

  const ensureLoaded = useCallback(() => {
    setStatus((current) => {
      if (current === "idle") {
        load();
      }
      return current;
    });
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  const results = useMemo(() => {
    if (status !== "ready") return [];
    return searchEntities(debouncedQuery, data);
  }, [status, debouncedQuery, data]);

  return { results, status, hasPartialFailure, ensureLoaded, refresh };
}
