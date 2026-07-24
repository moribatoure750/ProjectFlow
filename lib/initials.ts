/**
 * Calcule les initiales affichées dans l'Avatar du menu utilisateur
 * (Lot 6). Fonction pure, sans dépendance à Supabase ni au navigateur,
 * pour rester facilement testable isolément.
 *
 * Priorité :
 *  1. `displayName` — première lettre du premier mot, et première lettre
 *     du second mot s'il existe (ex: "Jean Dupont" -> "JD", "Jean" -> "JE").
 *  2. Partie locale de l'email (avant le `@`) — 2 premières lettres.
 *  3. Repli fixe `"U"` (utilisateur) si aucune donnée n'est disponible.
 */
export function getInitials(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const name = displayName?.trim();
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].slice(0, 2).toUpperCase();
  }

  const localPart = email?.trim().split("@")[0];
  if (localPart) {
    return localPart.slice(0, 2).toUpperCase();
  }

  return "U";
}
