/**
 * BarChart — graphique en barres SVG minimal, sans dépendance externe
 * (Lot 11). Une seule série (ex. charge de travail à venir, activité
 * créée par semaine), toujours accompagnée d'une valeur textuelle
 * visible sous chaque barre — jamais uniquement portée par le SVG.
 *
 * Accessibilité :
 *  - le `<svg>` est purement décoratif (`aria-hidden`) ;
 *  - le graphique complet est enveloppé dans un `role="img"` avec un
 *    `aria-label` résumant la série (ex. "Charge de travail à venir sur
 *    7 jours : 3 tâches le lundi 21, ...") ;
 *  - chaque point affiche sa valeur et son libellé en texte réel
 *    (jamais seulement dans le SVG), donc lisible sans dépendre de la
 *    couleur ni du rendu graphique.
 */
export interface BarChartDatum {
  key: string;
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  /** Résumé accessible du graphique, ex. "Charge de travail à venir". */
  ariaLabel: string;
  /** Affiché sous le graphique quand toutes les valeurs sont à 0, pour
   *  ne jamais laisser un ensemble de barres plates sans explication. */
  emptyMessage?: string;
  /** Hauteur de la zone de tracé en pixels (hors libellés). */
  height?: number;
  className?: string;
}

export function BarChart({
  data,
  ariaLabel,
  emptyMessage = "Aucune donnée sur cette période.",
  height = 96,
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const isAllZero = data.every((d) => d.value === 0);
  const summary = data.map((d) => `${d.label} : ${d.value}`).join(", ");

  return (
    <div
      role="img"
      aria-label={`${ariaLabel}. ${summary}`}
      className={className}
    >
      <div
        className="flex items-end gap-1.5 sm:gap-2"
        style={{ height }}
        aria-hidden="true"
      >
        {data.map((d) => {
          const barHeightPct = (d.value / maxValue) * 100;
          return (
            <div
              key={d.key}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[11px] font-medium text-fg-subtle">
                {d.value > 0 ? d.value : ""}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-sm bg-accent transition-all duration-slow ease-out"
                  style={{
                    height: `${Math.max(barHeightPct, d.value > 0 ? 4 : 1)}%`,
                    opacity: d.value > 0 ? 1 : 0.15,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5 sm:gap-2" aria-hidden="true">
        {data.map((d) => (
          <div key={d.key} className="flex-1 text-center">
            <span className="text-[11px] text-fg-subtle">{d.label}</span>
          </div>
        ))}
      </div>

      {isAllZero && (
        <p className="mt-2 text-xs text-fg-subtle">{emptyMessage}</p>
      )}
    </div>
  );
}
