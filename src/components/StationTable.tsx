import type { StationMetrics } from '../lib/run-scenario';
import type { Station } from '../engine/types';

interface StationTableProps {
  stations: Station[];
  metrics: StationMetrics[];
  bottleneckId: string;
}

export function StationTable({ stations, metrics, bottleneckId }: StationTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
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
                  {station.name}
                  {isBn && (
                    <>
                      {' '}
                      <span className="badge badge--red">bottleneck</span>
                    </>
                  )}
                </td>
                <td>{station.cycleTime}s</td>
                <td>{pct(station.availability)}</td>
                <td>{pct(m.utilization)}</td>
                <td>{pct(m.blockingRate)}</td>
                <td>{pct(m.starvationRate)}</td>
                <td>{m.totalProcessed}</td>
                <td>{m.totalScrapped}</td>
                <td>{m.totalReworked}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
