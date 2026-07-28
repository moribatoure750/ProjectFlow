import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons";

/**
 * EntityHeader — en-tête commun aux pages de détail (Lot 14A) : lien de
 * retour vers la liste parente, titre, badge de statut optionnel,
 * description optionnelle, et actions à droite (réservées aux futurs
 * lots — aucune action n'est ajoutée par défaut ici).
 */
export interface EntityHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
}

export function EntityHeader({
  title,
  description,
  badge,
  backHref,
  backLabel,
  actions,
}: EntityHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-fg">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-fg-muted">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
