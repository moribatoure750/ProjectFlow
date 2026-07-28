import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Breadcrumbs — fil d'Ariane commun aux pages de détail (Lot 14A).
 *
 * Le dernier élément est toujours affiché comme la page courante (pas
 * de lien, `aria-current="page"`), même s'il fournit un `href` — pour
 * ne jamais avoir un lien qui pointe vers la page déjà affichée.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-fg-subtle">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="max-w-[16rem] truncate rounded-md transition-colors duration-150 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "max-w-[16rem] truncate",
                    isLast && "font-medium text-fg"
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
