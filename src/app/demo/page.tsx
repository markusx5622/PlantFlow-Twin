import { PageShell } from '../../components/PageShell';
import { ScenarioCard } from '../../components/ScenarioCard';
import { getGoldenScenarios } from '../../lib/run-scenario';

export default function DemoPage() {
  const scenarios = getGoldenScenarios();

  return (
    <PageShell>
      <div className="hero">
        <h1 className="hero__title">Demo</h1>
        <p className="hero__subtitle">
          Select a golden scenario to run a full simulation using the real DES engine.
          Results are computed deterministically in the browser.
        </p>
      </div>

      <div className="scenario-grid">
        {scenarios.map((s) => (
          <ScenarioCard key={s.id} scenario={s} />
        ))}
      </div>
    </PageShell>
  );
}
