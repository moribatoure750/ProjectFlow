/**
 * Checklist des tâches (Lot 18) — liste d'éléments à cocher associée à
 * exactement une tâche (voir supabase/task_checklists.sql pour le
 * schéma/policies correspondants).
 *
 * Contrairement à `types/comment.ts`/`types/attachment.ts`, ce modèle
 * n'est pas polymorphe : une checklist n'existe que pour les tâches
 * (`/tasks/[id]`), jamais pour les projets ni les réunions — voir la
 * consigne du Lot 18. `taskId` référence donc directement la tâche,
 * sans `entityType`.
 *
 * Même esprit que les autres types de ce projet : un modèle minimal,
 * indépendant du nom des colonnes SQL (camelCase ici, snake_case en
 * base — voir services/checklist.service.ts pour la traduction dans
 * les deux sens).
 */
export interface ChecklistItem {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  completed: boolean;
  /** Position d'affichage au sein de la checklist de la tâche
   *  (ordre ascendant). Aucun autre mécanisme d'ordre (pas de
   *  drag & drop) : uniquement modifiable via `moveChecklistItem()`
   *  (boutons Monter/Descendre). */
  position: number;
  createdAt: string;
  /** Mise à jour à chaque modification (contenu ou coché/décoché). */
  updatedAt: string;
}

/** Entrée nécessaire à `createChecklistItem()`. */
export interface CreateChecklistItemInput {
  taskId: string;
  content: string;
}

/** Entrée nécessaire à `updateChecklistItemContent()` — seul le
 *  contenu est modifiable via cette fonction ; l'état coché/décoché
 *  passe par `toggleChecklistItemCompleted()`, la position par
 *  `moveChecklistItem()`. */
export interface UpdateChecklistItemInput {
  content: string;
}

/** Les 2 seuls déplacements possibles via les boutons Monter/Descendre
 *  (pas de drag & drop dans ce lot). */
export type ChecklistMoveDirection = "up" | "down";
