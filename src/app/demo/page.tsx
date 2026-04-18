import { PageShell } from '../../components/PageShell';
import { ScenarioCard } from '../../components/ScenarioCard';
import { getGoldenScenarios } from '../../lib/run-scenario';

export default function DemoPage() {
  const scenarios = getGoldenScenarios();

  return (
    <PageShell>
      <div className="hero">
        <div className="hero__eyebrow">Simulation Demo</div>
        <h1 className="hero__title">Production Scenarios</h1>
        <p className="hero__subtitle">
          Select a pre-configured production scenario to run a full simulation.
          All results are computed deterministically in the browser using the real DES engine.
        </p>
      </div>

      <div className="section">
        <h2 className="section__title">Available Scenarios</h2>
        <div className="scenario-grid">
          {scenarios.map((s) => (
            <ScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
