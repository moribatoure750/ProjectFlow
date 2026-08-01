/**
 * getDueDateTone — calcule une tonalité purement visuelle ("en retard" /
 * "aujourd'hui" / "normal") à partir d'une échéance déjà chargée en
 * mémoire. Aucun appel réseau, aucune logique métier modifiée : une
 * entité terminée/archivée n'est jamais présentée comme en retard.
 *
 * Introduit dans app/(app)/tasks/page.tsx (Lot 13) pour les tâches ;
 * généralisé ici (Lot 20) pour être réutilisé par la sidebar de détail
 * d'une tâche et par les projets (carte liste + sidebar détail), qui
 * n'avaient jusqu'ici aucune alerte d'échéance.
 *
 * Les dates sont comparées via leurs composantes calendaires locales
 * (jamais `new Date(str)` seul, qui interprète "YYYY-MM-DD" comme UTC
 * et peut décaler d'un jour selon le fuseau du visiteur).
 */
export type DueDateTone = "overdue" | "today" | "normal";

export function getDueDateTone(dueDate: string, isDone: boolean): DueDateTone {
  if (isDone) return "normal";
  if (!dueDate) return "normal";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDate);
  if (!match) return "normal";

  const due = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  if (Number.isNaN(due.getTime())) return "normal";

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < now.getTime()) return "overdue";
  if (due.getTime() === now.getTime()) return "today";
  return "normal";
}

/** Classes de texte associées à chaque tonalité — utilisées à côté d'une
 * icône calendrier (voir app/(app)/tasks/page.tsx pour le pattern
 * d'origine). */
export const dueDateToneClasses: Record<DueDateTone, string> = {
  overdue: "text-danger-600",
  today: "text-warning-600",
  normal: "text-fg-subtle",
};

/** Court suffixe optionnel affiché à côté de la date formatée. */
export const dueDateToneSuffix: Record<DueDateTone, string> = {
  overdue: " · En retard",
  today: " · Aujourd’hui",
  normal: "",
};
