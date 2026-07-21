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
