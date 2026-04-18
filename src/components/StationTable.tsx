import type { StationMetrics } from '../lib/run-scenario';
import type { Station } from '../engine/types';
import { stationDisplayName, formatPct } from '../lib/format';

interface StationTableProps {
  stations: Station[];
  metrics: StationMetrics[];
  bottleneckId: string;
}

export function StationTable({ stations, metrics, bottleneckId }: StationTableProps) {
  return (
    <div className="data-table__wrap">
      <table className="data-table data-table--highlight">
        <thead>
          <tr>
            <th>Station</th>
            <th>Cycle Time</th>
            <th>Availability</th>
            <th>Utilization</th>
            <th>Blocking</th>
            <th>Starvation</th>
            <th>Processed</th>
            <th>Scrapped</th>
            <th>Reworked</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station, i) => {
            const m = metrics[i];
            const isBn = station.id === bottleneckId;
            return (
              <tr key={station.id} className={isBn ? 'bottleneck' : ''}>
                <td>
                  {stationDisplayName(station)}
                  {isBn && (
                    <>
                      {' '}
                      <span className="badge badge--red">Bottleneck</span>
                    </>
                  )}
                </td>
                <td>{station.cycleTime}s</td>
                <td>{formatPct(station.availability)}</td>
                <td style={m.utilization > 0.85 ? { color: 'var(--warning)' } : undefined}>
                  {formatPct(m.utilization)}
                </td>
                <td>{formatPct(m.blockingRate)}</td>
                <td>{formatPct(m.starvationRate)}</td>
                <td>{m.totalProcessed.toLocaleString()}</td>
                <td>{m.totalScrapped.toLocaleString()}</td>
                <td>{m.totalReworked.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
