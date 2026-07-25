import type { ComponentType, SVGProps } from "react";
import { CheckSquareIcon, FolderIcon, UsersIcon } from "@/components/ui/icons";
import type { SearchEntityKind } from "@/types/search";

/**
 * Mapping `SearchEntityKind` → présentation (libellés, icône), sur le
 * même modèle que `lib/badge-tones.ts`/`lib/notification-meta.ts`.
 * `types/search.ts` reste ainsi strictement centré sur les données,
 * jamais sur l'UI (aucune dépendance React dans le type `SearchResult`).
 */
interface SearchKindInfo {
  label: string;
  pluralLabel: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Ordre d'affichage des catégories dans la palette (Projets → Tâches
 *  → Réunions), cohérent avec la Sidebar. */
export const SEARCH_KIND_ORDER: SearchEntityKind[] = ["project", "task", "meeting"];

export function searchKindInfo(kind: SearchEntityKind): SearchKindInfo {
  switch (kind) {
    case "project":
      return { label: "Projet", pluralLabel: "Projets", icon: FolderIcon };
    case "task":
      return { label: "Tâche", pluralLabel: "Tâches", icon: CheckSquareIcon };
    case "meeting":
      return { label: "Réunion", pluralLabel: "Réunions", icon: UsersIcon };
    default:
      return { label: kind, pluralLabel: kind, icon: FolderIcon };
  }
}
