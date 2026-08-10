/**
 * Dark Mode — constantes et logique de résolution de thème partagées par
 * le script anti-flash inline (`app/layout.tsx`) et le `ThemeProvider`
 * (`components/theme/ThemeProvider.tsx`).
 *
 * Le Design System expose déjà tous les tokens Dark Mode au niveau CSS
 * (voir `app/globals.css`, bloc `.dark` + `@custom-variant dark`) : il ne
 * reste qu'à piloter la classe `.dark` sur `<html>` et à la persister.
 *
 * Trois valeurs possibles :
 *  - `"light"` / `"dark"` : préférence explicite de l'utilisateur, persistée.
 *  - `"system"`           : suit `prefers-color-scheme` (valeur par défaut
 *    tant que l'utilisateur n'a rien choisi).
 */
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "pf-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** Lit la préférence persistée (`localStorage`), `"system"` par défaut si
 *  absente, invalide, ou si `localStorage` est indisponible (SSR, navigation
 *  privée, quota dépassé). */
export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Résout une préférence (`Theme`) en thème effectif (`"light" | "dark"`),
 *  en retombant sur la préférence système pour `"system"`. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

/**
 * Script anti-flash (Next.js 16, voir
 * `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`)
 * exécuté de façon synchrone dans `<head>` avant le premier paint, pour
 * appliquer la classe `.dark` sur `<html>` d'après la préférence
 * persistée (ou la préférence système par défaut) — évite tout flash
 * clair→sombre au chargement.
 *
 * Doit rester strictement synchronisé avec `readStoredTheme`/
 * `resolveTheme` ci-dessus, que `ThemeProvider` réutilise comme
 * initialiseur paresseux côté client pour que l'état React initial
 * corresponde toujours au DOM déjà modifié par ce script.
 */
export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);var isDark=t==="dark"||((t!=="light"&&t!=="dark")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",isDark)}catch(e){}})();`;
