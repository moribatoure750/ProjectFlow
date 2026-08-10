"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

interface ThemeContextValue {
  /** Préférence brute de l'utilisateur (`"light" | "dark" | "system"`). */
  theme: Theme;
  /** Thème effectivement appliqué (`"system"` résolu vers `light`/`dark`). */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  /** Bascule simplement entre `light` et `dark` (utilisé par `ThemeToggle`) —
   *  quitte l'état `"system"` dès que l'utilisateur interagit explicitement. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * ThemeProvider — pilote la classe `.dark` sur `<html>` et persiste la
 * préférence de thème dans `localStorage` (Dark Mode, Design System
 * ProjectFlow).
 *
 * L'état initial est lu de façon paresseuse depuis `localStorage`
 * (`readStoredTheme`), exactement comme le script anti-flash inline posé
 * dans `app/layout.tsx` — les deux sources restent synchronisées, donc
 * l'état React initial correspond toujours à la classe déjà présente sur
 * `<html>` au moment de l'hydratation (pas de flash, pas de warning
 * d'hydratation à supprimer ici).
 *
 * Monté une seule fois dans `app/layout.tsx`, au-dessus des groupes de
 * routes `(app)` et `(auth)`, afin que le Dark Mode s'applique à
 * l'ensemble de l'application (AppShell comme pages d'authentification).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  // Tant que l'utilisateur n'a pas choisi explicitement "light"/"dark", on
  // reste réactif aux changements de préférence système (ex: bascule
  // automatique nuit/jour du système d'exploitation).
  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(event: MediaQueryListEvent) {
      document.documentElement.classList.toggle("dark", event.matches);
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage indisponible (navigation privée, quota dépassé...) :
      // le thème reste appliqué pour la session en cours, simplement non
      // persisté au prochain chargement.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() doit être utilisé sous <ThemeProvider>.");
  }
  return ctx;
}
