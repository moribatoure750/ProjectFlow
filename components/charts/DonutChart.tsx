import { chartToneBgClass, chartToneTextClass } from "@/lib/chart-tones";
import type { ChartDatum } from "@/types/dashboard-analytics";

/**
 * DonutChart — anneau SVG minimal, sans dépendance externe (Lot 11).
 * Utilisé pour une répartition catégorielle courte (2-3 segments, ex.
 * tâches par statut).
 *
 * Accessibilité :
 *  - le `<svg>` est décoratif (`aria-hidden`) ;
 *  - un `role="img"` + `aria-label` résume l'ensemble des segments en
 *    texte (ex. "Répartition des tâches par statut : À faire : 3
 *    (30%), ...") ;
 *  - une légende visible (pastille + libellé + valeur) accompagne
 *    toujours l'anneau — la couleur n'est jamais le seul moyen de
 *    distinguer un segment.
 *
 * États limites gérés explicitement :
 *  - total = 0 → anneau neutre (gris) + centre "0", jamais un segment
 *    coloré trompeur ;
 *  - un seul segment non nul → l'anneau se dessine naturellement en
 *    cercle complet de cette couleur (aucun cas particulier requis, la
 *    même formule mathématique s'applique).
 */
export interface DonutChartProps {
  data: ChartDatum[];
  ariaLabel: string;
  /** Libellé affiché au centre de l'anneau, ex. "12 tâches". */
  centerLabel?: string;
  size?: number;
}

const RADIUS = 40;
const STROKE_WIDTH = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({
  data,
  ariaLabel,
  centerLabel,
  size = 140,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const summary = data
    .map((d) => {
      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
      return `${d.label} : ${d.value} (${pct}%)`;
    })
    .join(", ");

  let cumulativePct = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        role="img"
        aria-label={`${ariaLabel}. ${summary}`}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          {total === 0 ? (
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH}
              className="text-border"
              stroke="currentColor"
            />
          ) : (
            data
              .filter((d) => d.value > 0)
              .map((d) => {
                const pct = d.value / total;
                const dashArray = `${pct * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
                const dashOffset = -cumulativePct * CIRCUMFERENCE;
                cumulativePct += pct;
                return (
                  <circle
                    key={d.key}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    stroke="currentColor"
                    className={chartToneTextClass(d.tone)}
                  />
                );
              })
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-fg">
            {centerLabel ?? total}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.key} className="flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${chartToneBgClass(d.tone)}`}
                aria-hidden="true"
              />
              <span className="text-fg-muted">{d.label}</span>
              <span className="font-medium text-fg">
                {d.value}
                <span className="ml-1 text-fg-subtle">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
