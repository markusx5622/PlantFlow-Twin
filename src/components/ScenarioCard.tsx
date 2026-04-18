import Link from 'next/link';
import type { Scenario } from '../lib/run-scenario';
import { formatDuration } from '../lib/format';

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
        <span className="scenario-card__tag">⚙ {stationCount} stations</span>
        <span className="scenario-card__tag">⇄ {bufferCount} buffers</span>
        <span className="scenario-card__tag">⏱ {duration}</span>
      </div>
    </Link>
  );
}
