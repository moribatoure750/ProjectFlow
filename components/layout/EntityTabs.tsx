"use client";

import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

export interface EntityTab {
  key: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface EntityTabsProps {
  tabs: EntityTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * EntityTabs — barre d'onglets commune aux pages de détail (Lot 14B).
 * Ne bascule que le contenu principal (colonne 2/3) ; la colonne
 * latérale `EntitySidebar` reste affichée quel que soit l'onglet actif.
 *
 * Défilement horizontal sur mobile (`overflow-x-auto`) plutôt qu'un
 * retour à la ligne, pour ne jamais casser la mise en page étroite —
 * cohérent avec le toggle Agenda/Calendrier de app/(app)/meetings/page.tsx.
 */
export function EntityTabs({ tabs, active, onChange, className }: EntityTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Sections"
      className={cn(
        "mb-6 flex gap-1 overflow-x-auto border-b border-border",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
