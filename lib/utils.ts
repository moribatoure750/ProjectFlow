import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine conditional class names (via `clsx`) and safely merge conflicting
 * Tailwind utility classes (via `tailwind-merge`), so that a class passed
 * through `className` always wins over a component's default class.
 *
 * @example
 * cn("px-2 py-1", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Discreet danger action classes for a `ghost`/`secondary` `Button` used
 * as a "Supprimer" trigger, kept local to a `className` override rather
 * than the shared `danger` variant so the action stays identifiable
 * without visually dominating the surrounding UI (see app/projects/page.tsx
 * for the original rationale). Shared by the three entity detail pages
 * (Lot 14A: /projects/[id], /tasks/[id], /meetings/[id]) to avoid
 * repeating the same literal in each file.
 */
export const dangerGhostClasses =
  "text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-600 dark:hover:bg-danger-100/10 dark:hover:text-danger-600";

