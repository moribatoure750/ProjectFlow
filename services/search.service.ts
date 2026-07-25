import { projectStatusInfo } from "@/lib/badge-tones";
import type { MeetingWithProject } from "@/types/meeting";
import type { Project } from "@/types/project";
import type { SearchResult } from "@/types/search";
import type { TaskWithProject } from "@/types/task";

/**
 * Service de recherche globale (Lot 12) — aucune table, aucun appel
 * réseau : `searchEntities()` est une fonction pure qui score les
 * données déjà chargées (`projects`/`tasks`/`meetings`) en mémoire,
 * sur le même principe que `computeDashboardAnalytics` (Lot 11) et
 * `computeNotifications` (Lot 10A).
 *
 * Le composant `CommandPalette` ne contient aucune règle de matching :
 * il se contente d'afficher le résultat de cette fonction.
 */

/** Résultats maximum retenus par catégorie (avant le plafond global). */
const MAX_PER_CATEGORY = 8;
/** Résultats maximum retournés au total, toutes catégories confondues. */
const MAX_TOTAL = 20;

// --- Normalisation & scoring ------------------------------------------------

/**
 * Normalise un texte pour la comparaison : minuscules, accents retirés
 * (ex. "réunion" ~ "reunion"), espaces multiples réduits à un seul,
 * espaces de début/fin supprimés. Toujours la même fonction pour la
 * requête et pour les champs comparés, afin que le scoring reste
 * déterministe et symétrique.
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score de correspondance entre une requête et un champ, déjà
 * normalisés. Un seul niveau de correspondance est retenu par champ
 * (jamais de somme) :
 *  - égalité exacte             → 100
 *  - le champ commence par ...  → 70
 *  - un mot du champ commence par ... → 50
 *  - sous-chaîne simple         → 30
 *  - aucune correspondance      → 0
 */
function matchScore(normalizedQuery: string, normalizedField: string): number {
  if (!normalizedField || !normalizedQuery) return 0;

  if (normalizedField === normalizedQuery) return 100;
  if (normalizedField.startsWith(normalizedQuery)) return 70;

  const words = normalizedField.split(" ");
  if (words.some((word) => word.startsWith(normalizedQuery))) return 50;

  if (normalizedField.includes(normalizedQuery)) return 30;

  return 0;
}

/** Score pondéré d'un champ brut (peut être `null`/`undefined`/vide). */
function scoreField(
  normalizedQuery: string,
  rawField: string | null | undefined,
  weight: number
): number {
  if (!rawField) return 0;
  return matchScore(normalizedQuery, normalizeText(rawField)) * weight;
}

/** Le meilleur score l'emporte toujours — jamais de cumul entre champs. */
function bestScore(scores: number[]): number {
  return Math.max(0, ...scores);
}

// --- Construction des résultats par type d'entité --------------------------

function searchProjects(normalizedQuery: string, projects: Project[]): SearchResult[] {
  const results: SearchResult[] = [];

  for (const project of projects) {
    const score = bestScore([
      scoreField(normalizedQuery, project.title, 1),
      scoreField(normalizedQuery, project.description, 0.6),
    ]);
    if (score <= 0) continue;

    results.push({
      kind: "project",
      id: project.id,
      title: project.title,
      subtitle: projectStatusInfo(project.status).label,
      href: "/projects",
      score,
    });
  }

  return results;
}

function searchTasks(normalizedQuery: string, tasks: TaskWithProject[]): SearchResult[] {
  const results: SearchResult[] = [];

  for (const task of tasks) {
    const score = bestScore([
      scoreField(normalizedQuery, task.title, 1),
      scoreField(normalizedQuery, task.description, 0.6),
      scoreField(normalizedQuery, task.projects?.title, 0.4),
    ]);
    if (score <= 0) continue;

    results.push({
      kind: "task",
      id: task.id,
      title: task.title,
      subtitle: task.projects?.title ?? "Sans projet",
      href: "/tasks",
      score,
    });
  }

  return results;
}

function searchMeetings(
  normalizedQuery: string,
  meetings: MeetingWithProject[]
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const meeting of meetings) {
    const score = bestScore([
      scoreField(normalizedQuery, meeting.title, 1),
      scoreField(normalizedQuery, meeting.description, 0.6),
      scoreField(normalizedQuery, meeting.location, 0.6),
      scoreField(normalizedQuery, meeting.projects?.title, 0.4),
    ]);
    if (score <= 0) continue;

    results.push({
      kind: "meeting",
      id: meeting.id,
      title: meeting.title,
      subtitle: meeting.projects?.title ?? "Sans projet",
      href: "/meetings",
      score,
    });
  }

  return results;
}

/** Tri stable : score décroissant, puis titre alphabétique. */
function byScoreThenTitle(a: SearchResult, b: SearchResult): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.title.localeCompare(b.title);
}

export interface SearchEntitiesData {
  projects: Project[];
  tasks: TaskWithProject[];
  meetings: MeetingWithProject[];
}

/**
 * Recherche globale, pure et synchrone, sur les projets/tâches/
 * réunions déjà chargés.
 *
 * - Requête vide (après normalisation) → aucun résultat.
 * - Chaque catégorie est plafonnée à `MAX_PER_CATEGORY` résultats,
 *   avant un plafond global de `MAX_TOTAL`, pour qu'aucune catégorie
 *   ne puisse monopoliser l'ensemble des résultats affichés.
 *
 * Conçue pour rester stable si de futurs lots ajoutent des filtres,
 * des tags ou une recherche serveur : ces évolutions pourront être
 * ajoutées comme un 3ᵉ paramètre `options` optionnel, sans jamais
 * changer la signature `searchEntities(query, data)` existante ni le
 * contrat `SearchResult`.
 */
export function searchEntities(
  query: string,
  data: SearchEntitiesData
): SearchResult[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const byCategory: SearchResult[][] = [
    searchProjects(normalizedQuery, data.projects).sort(byScoreThenTitle).slice(0, MAX_PER_CATEGORY),
    searchTasks(normalizedQuery, data.tasks).sort(byScoreThenTitle).slice(0, MAX_PER_CATEGORY),
    searchMeetings(normalizedQuery, data.meetings).sort(byScoreThenTitle).slice(0, MAX_PER_CATEGORY),
  ];

  return byCategory
    .flat()
    .sort(byScoreThenTitle)
    .slice(0, MAX_TOTAL);
}
