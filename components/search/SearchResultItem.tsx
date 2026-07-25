import { searchKindInfo } from "@/lib/search-meta";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/search";

export interface SearchResultItemProps {
  result: SearchResult;
  active: boolean;
  optionId: string;
  onSelect: () => void;
  onHover: () => void;
}

/**
 * Ligne de résultat de la palette de recherche — pur affichage, aucune
 * règle de matching ici (le score de `result` n'est jamais rendu à
 * l'écran, uniquement utilisé en amont par `searchEntities()` pour le
 * tri).
 */
export function SearchResultItem({
  result,
  active,
  optionId,
  onSelect,
  onHover,
}: SearchResultItemProps) {
  const { icon: Icon } = searchKindInfo(result.kind);

  return (
    <div
      id={optionId}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ease-out",
        active ? "bg-accent-soft text-accent-soft-foreground" : "text-fg hover:bg-surface-hover"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          active ? "bg-surface/60" : "bg-surface-hover"
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{result.title}</p>
        {result.subtitle && (
          <p
            className={cn(
              "truncate text-xs",
              active ? "text-accent-soft-foreground/80" : "text-fg-subtle"
            )}
          >
            {result.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
