import Link from 'next/link';
import type { Scenario } from '../lib/run-scenario';

interface ScenarioCardProps {
  scenario: Scenario;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const stationCount = scenario.lineModel.stations.length;
  const bufferCount = scenario.lineModel.buffers.length;
  const duration = formatDuration(scenario.config.totalDuration);

  return (
    <Link href={`/demo/${scenario.id}`} className="scenario-card">
      <div className="scenario-card__name">{scenario.name}</div>
      <div className="scenario-card__desc">{scenario.description}</div>
      <div className="scenario-card__meta">
        {stationCount} stations · {bufferCount} buffers · {duration}
      </div>
    </Link>
  );
}

function formatDuration(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours}h shift`;
  return `${seconds / 60}min`;
}
