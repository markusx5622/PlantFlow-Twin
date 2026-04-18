import Link from 'next/link';
import { PageShell } from '../components/PageShell';

export default function HomePage() {
  return (
    <PageShell>
      <div className="hero">
        <h1 className="hero__title">PlantFlow Twin</h1>
        <p className="hero__subtitle">
          A lightweight deterministic process twin for manufacturing line simulation.
          Model, simulate, and analyze production lines with a real discrete event simulation engine.
        </p>
      </div>

      <div className="section">
        <h2 className="section__title">What is this?</h2>
        <p className="section__subtitle">
          PlantFlow Twin is a <strong>discrete event simulation (DES) engine</strong> that models
          sequential production lines with stations, buffers, shifts, breaks, defects, and rework.
          It produces deterministic, reproducible results — no randomness, no approximations.
        </p>
      </div>

      <div className="section">
        <h2 className="section__title">Engine capabilities</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card__label">Simulation</div>
            <div className="kpi-card__value" style={{ fontSize: '1rem' }}>Deterministic DES</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Analysis</div>
            <div className="kpi-card__value" style={{ fontSize: '1rem' }}>Bottleneck detection</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Optimization</div>
            <div className="kpi-card__value" style={{ fontSize: '1rem' }}>Recommendations</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Validation</div>
            <div className="kpi-card__value" style={{ fontSize: '1rem' }}>Golden scenarios</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section__title">Explore</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/demo" className="btn btn--primary">
            → Demo: Golden Scenarios
          </Link>
          <Link href="/debug" className="btn">
            → Debug: Engine Inspector
          </Link>
        </div>
      </div>

      <div className="section">
        <h2 className="section__title">Technical details</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '600px' }}>
          The engine implements spec v1.1 with support for: deterministic defect accumulation,
          rework with max attempts, blocking and starvation, multi-slot station capacity,
          shift/break scheduling, warmup periods, and cut-off termination. Bottleneck detection
          uses a composite weighted score (utilization, upstream queue, downstream starvation,
          inverse blocking). Recommendations are rule-based candidates targeting the identified
          bottleneck.
        </p>
      </div>
    </PageShell>
  );
}
