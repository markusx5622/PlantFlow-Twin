// ─── PlantFlow Twin — Station Comparison Table ───
// Per-station utilization comparison with bottleneck shift indicators.

import type { StationComparison } from '../lib/comparison';
import type { Station } from '../engine/types';
import { stationDisplayName, formatPct } from '../lib/format';

interface StationComparisonTableProps {
  stations: Station[];
  comparisons: StationComparison[];
  bottleneckChanged: boolean;
}

/** Threshold for significant utilization delta coloring. */
const UTILIZATION_DELTA_THRESHOLD = 0.01;

export function StationComparisonTable({
  stations,
  comparisons,
  bottleneckChanged,
}: StationComparisonTableProps) {
  return (
    <div className="data-table__wrap">
      <table className="data-table data-table--highlight">
        <thead>
          <tr>
            <th>Station</th>
            <th>Util (Before)</th>
            <th>Util (After)</th>
            <th>Δ Util</th>
            <th>Block (Before)</th>
            <th>Block (After)</th>
            <th>Starve (Before)</th>
            <th>Starve (After)</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => {
            const station = stations.find((s) => s.id === c.stationId);
            const name = station ? stationDisplayName(station) : c.stationId;

            const rowClass = c.isBottleneck ? 'bottleneck' : '';

            return (
              <tr key={c.stationId} className={rowClass}>
                <td>
                  {name}
                  {c.wasBottleneck && !c.isBottleneck && (
                    <> <span className="badge badge--green">Was BN</span></>
                  )}
                  {c.isBottleneck && !c.wasBottleneck && (
                    <> <span className="badge badge--red">New BN</span></>
                  )}
                  {c.isBottleneck && c.wasBottleneck && (
                    <> <span className="badge badge--red">Bottleneck</span></>
                  )}
                </td>
                <td>{formatPct(c.baselineUtilization)}</td>
                <td>{formatPct(c.variantUtilization)}</td>
                <td style={{ color: c.utilizationDelta > UTILIZATION_DELTA_THRESHOLD ? 'var(--warning)' : c.utilizationDelta < -UTILIZATION_DELTA_THRESHOLD ? 'var(--success)' : undefined }}>
                  {c.utilizationDelta > 0 ? '+' : ''}{formatPct(c.utilizationDelta)}
                </td>
                <td>{formatPct(c.baselineBlocking)}</td>
                <td>{formatPct(c.variantBlocking)}</td>
                <td>{formatPct(c.baselineStarvation)}</td>
                <td>{formatPct(c.variantStarvation)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {bottleneckChanged && (
        <div className="comparison-alert">
          ⚠ Bottleneck shifted — the constraining station changed between baseline and variant.
        </div>
      )}
    </div>
  );
}
