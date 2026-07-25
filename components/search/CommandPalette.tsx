"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { SearchIcon } from "@/components/ui/icons";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SEARCH_KIND_ORDER, searchKindInfo } from "@/lib/search-meta";
import type { SearchResult } from "@/types/search";
import { SearchResultItem } from "./SearchResultItem";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function optionId(listboxId: string, result: SearchResult): string {
  return `${listboxId}-${result.kind}-${result.id}`;
}

/**
 * Palette de recherche globale (Lot 12) — 100% présentation : aucune
 * règle de matching ici, tout le scoring vit dans
 * `services/search.service.ts` (via `useGlobalSearch`). Ce composant
 * gère uniquement l'ouverture/fermeture, le focus, la navigation
 * clavier et le rendu groupé des résultats.
 *
 * Monté une seule fois par `AppShell`, toujours dans l'arbre (même
 * fermé) afin que `useGlobalSearch` conserve ses données en mémoire
 * entre deux ouvertures — même pattern que `components/ui/Modal.tsx`.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const { results, status, hasPartialFailure, ensureLoaded, refresh } =
    useGlobalSearch(query);

  const groups = useMemo(() => {
    return SEARCH_KIND_ORDER.map((kind) => ({
      kind,
      items: results.filter((r) => r.kind === kind),
    })).filter((group) => group.items.length > 0);
  }, [results]);

  /** Ordre d'affichage réel (groupé) — sert de référence unique à la
   *  navigation clavier, pour que les flèches suivent exactement ce
   *  que l'utilisateur voit à l'écran. */
  const flatResults = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Toujours borné à `flatResults`, calculé directement au rendu (pas
  // d'effet de synchronisation) : reste cohérent même juste après une
  // frappe qui réduit le nombre de résultats.
  const activeIndexClamped = Math.min(activeIndex, Math.max(flatResults.length - 1, 0));

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!open) return;
    ensureLoaded();
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open, ensureLoaded]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  /** Ferme la palette et réinitialise son état interne (requête,
   *  sélection). Utilisé par Escape, le clic sur le fond et la
   *  sélection d'un résultat, pour que la prochaine ouverture reparte
   *  toujours d'une requête vide — sans dépendre d'un effet
   *  synchronisé sur `open`. */
  function closeAndReset() {
    onClose();
    setQuery("");
    setActiveIndex(0);
  }

  function navigateToResult(result: SearchResult) {
    closeAndReset();
    router.push(result.href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex(Math.min(activeIndexClamped + 1, flatResults.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(Math.max(activeIndexClamped - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(flatResults.length - 1);
        break;
      case "Enter": {
        event.preventDefault();
        const selected = flatResults[activeIndexClamped];
        if (selected) navigateToResult(selected);
        break;
      }
      case "Escape":
        closeAndReset();
        break;
      default:
        break;
    }
  }

  if (!open) return null;

  const activeResult = flatResults[activeIndexClamped];
  const activeOptionId = activeResult ? optionId(listboxId, activeResult) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-center sm:items-start sm:p-4 sm:pt-[10vh]">
      <div
        className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm animate-fade-in"
        onClick={closeAndReset}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
        className="relative flex h-full w-full flex-col overflow-hidden bg-surface shadow-xl animate-scale-in sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-[700px] sm:rounded-xl sm:border sm:border-border"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={flatResults.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un projet, une tâche, une réunion..."
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-fg-subtle sm:inline-block">
            Échap
          </kbd>
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          {status === "ready" && trimmedQuery
            ? `${results.length} résultat${results.length > 1 ? "s" : ""}`
            : ""}
        </span>

        <div
          id={listboxId}
          role="listbox"
          aria-label="Résultats de recherche"
          className="flex-1 overflow-y-auto p-2"
        >
          {trimmedQuery === "" ? (
            <EmptyState
              compact
              icon={<SearchIcon className="h-8 w-8" />}
              title="Commencez à taper pour rechercher..."
              description="Recherchez parmi vos projets, tâches et réunions."
            />
          ) : status === "loading" || status === "idle" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
              <Spinner size="sm" />
              Chargement...
            </div>
          ) : status === "error" ? (
            <EmptyState
              compact
              title="Impossible de charger les résultats"
              description="Une erreur est survenue lors du chargement de vos données."
              action={
                <Button variant="secondary" size="sm" onClick={refresh}>
                  Réessayer
                </Button>
              }
            />
          ) : results.length === 0 ? (
            <EmptyState
              compact
              title="Aucun résultat"
              description={`Aucun résultat pour « ${trimmedQuery} ».`}
            />
          ) : (
            <div className="space-y-3">
              {hasPartialFailure && (
                <p className="px-2 text-xs text-warning-700">
                  Certaines données n&apos;ont pas pu être chargées.
                </p>
              )}
              {groups.map((group) => {
                const { pluralLabel } = searchKindInfo(group.kind);
                return (
                  <div key={group.kind}>
                    <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      {pluralLabel}
                    </p>
                    {group.items.map((item) => {
                      const flatIndex = flatResults.indexOf(item);
                      return (
                        <SearchResultItem
                          key={`${item.kind}-${item.id}`}
                          result={item}
                          active={flatIndex === activeIndexClamped}
                          optionId={optionId(listboxId, item)}
                          onSelect={() => navigateToResult(item)}
                          onHover={() => setActiveIndex(flatIndex)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
