export type SearchEntityKind = "project" | "task" | "meeting";

/**
 * Résultat de recherche globale (Lot 12) — type purement métier, sans
 * aucune dépendance à React : aucune icône n'est stockée ici (le
 * mapping `kind -> icône/libellé` vit côté UI, dans
 * `lib/search-meta.ts`), pour que ce type reste réutilisable par un
 * futur moteur de recherche serveur sans changement de contrat.
 */
export interface SearchResult {
  kind: SearchEntityKind;
  id: string;
  title: string;
  /** Ex. titre du projet parent (tâche/réunion), ou statut (projet). */
  subtitle?: string;
  /** Route de destination — le Lot 12 ne cible que la page de liste
   *  (/projects, /tasks, /meetings), sans scroll ni sélection ciblée. */
  href: string;
  /** Score de pertinence interne — jamais affiché, utilisé pour le tri
   *  et la répartition entre catégories. */
  score: number;
}
