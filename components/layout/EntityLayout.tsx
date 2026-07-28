import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

/**
 * EntityLayout — enveloppe commune des pages de détail (Lot 14A) :
 * fil d'Ariane en haut, contenu libre en dessous (généralement un
 * `EntityHeader` suivi du contenu propre à chaque entité).
 */
export interface EntityLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

export function EntityLayout({ breadcrumbs, children }: EntityLayoutProps) {
  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      {children}
    </div>
  );
}
