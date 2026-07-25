import type { BadgeTone } from "@/components/ui/Badge";

/**
 * Mapping `BadgeTone` → classes de couleur pleine (texte/fond), pour les
 * graphiques (`DonutChart`) et légendes du Dashboard analytique (Lot 11).
 *
 * Réutilise exclusivement les tokens sémantiques déjà définis dans
 * `app/globals.css` (aucune couleur codée en dur) et reste cohérent
 * avec les badges de statut/priorité déjà affichés ailleurs
 * (`lib/badge-tones.ts`) : une même catégorie garde la même couleur,
 * qu'elle soit affichée en `Badge` ou en segment de graphique.
 */
const textClasses: Record<BadgeTone, string> = {
  gray: "text-fg-subtle",
  blue: "text-info-600",
  green: "text-success-600",
  red: "text-danger-600",
  orange: "text-warning-600",
  purple: "text-accent",
};

const bgClasses: Record<BadgeTone, string> = {
  gray: "bg-fg-subtle",
  blue: "bg-info-600",
  green: "bg-success-600",
  red: "bg-danger-600",
  orange: "bg-warning-600",
  purple: "bg-accent",
};

/** Classe `text-*` — utilisée avec `fill="currentColor"`/`stroke="currentColor"`
 *  dans les SVG (même pattern que `components/ui/icons.tsx`). */
export function chartToneTextClass(tone: BadgeTone): string {
  return textClasses[tone];
}

/** Classe `bg-*` — utilisée pour le pastille de légende (couleur pleine,
 *  hors SVG). */
export function chartToneBgClass(tone: BadgeTone): string {
  return bgClasses[tone];
}
