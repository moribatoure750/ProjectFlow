import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ProjectProgressItem } from "@/types/dashboard-analytics";

/**
 * ProjectProgressList — progression (tâches terminées / total) des
 * projets actifs, triés par progression décroissante puis par titre
 * (ordre déjà garanti par `computeDashboardAnalytics`).
 *
 * Affiche au maximum `limit` projets ; si `items` en contient davantage,
 * un lien "Voir tous les projets" est affiché — pas de pagination dans
 * ce lot.
 */
export interface ProjectProgressListProps {
  items: ProjectProgressItem[];
  limit?: number;
}

export function ProjectProgressList({ items, limit = 5 }: ProjectProgressListProps) {
  const visible = items.slice(0, limit);
  const remaining = items.length - visible.length;

  return (
    <div className="space-y-4">
      {visible.map((item) => (
        <div key={item.projectId}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-fg">
              {item.title}
            </p>
            <span className="shrink-0 text-xs font-medium text-fg-muted">
              {item.totalTasks === 0
                ? "Aucune tâche"
                : `${item.doneTasks}/${item.totalTasks} · ${item.completionRate}%`}
            </span>
          </div>
          <ProgressBar
            value={item.completionRate}
            label={`Progression de ${item.title}`}
          />
        </div>
      ))}

      {remaining > 0 && (
        <Link
          href="/projects"
          className="inline-flex items-center rounded-md text-sm font-medium text-fg-muted transition-colors duration-150 ease-out hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Voir {remaining === 1 ? "1 autre projet" : `les ${remaining} autres projets`}
        </Link>
      )}
    </div>
  );
}
