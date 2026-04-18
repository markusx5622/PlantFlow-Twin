import Link from 'next/link';
import { PageShell } from '../components/PageShell';

export default function HomePage() {
  return (
    <PageShell>
      <div className="hero">
        <div className="hero__eyebrow">Manufacturing Digital Twin</div>
        <h1 className="hero__title">PlantFlow Twin</h1>
        <p className="hero__subtitle">
          A deterministic process twin for manufacturing line simulation.
          Model production lines, identify bottlenecks, and generate actionable
          optimization recommendations — all computed in real time.
        </p>
        <div className="home-stats">
          <div className="home-stat">
            <span className="home-stat__value">v1.1</span>
            <span className="home-stat__label">Engine Spec</span>
          </div>
          <div className="home-stat">
            <span className="home-stat__value">DES</span>
            <span className="home-stat__label">Discrete Event</span>
          </div>
          <div className="home-stat">
            <span className="home-stat__value">100%</span>
            <span className="home-stat__label">Deterministic</span>
          </div>
          <div className="home-stat">
            <span className="home-stat__value">&lt;50ms</span>
            <span className="home-stat__label">Sim Time</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section__title">Core Capabilities</h2>
        <div className="capability-grid">
          <div className="capability-card">
            <div className="capability-card__icon">⚙</div>
            <div className="capability-card__title">Discrete Event Simulation</div>
            <div className="capability-card__desc">
              Deterministic DES engine with stations, buffers, shifts, breaks, defects, and rework.
              Fully reproducible results — no randomness.
            </div>
          </div>
          <div className="capability-card">
            <div className="capability-card__icon">🔍</div>
            <div className="capability-card__title">Bottleneck Detection</div>
            <div className="capability-card__desc">
              Composite scoring algorithm identifies the constraining station using utilization,
              queue depth, starvation, and blocking analysis.
            </div>
          </div>
          <div className="capability-card">
            <div className="capability-card__icon">📊</div>
            <div className="capability-card__title">Production Analytics</div>
            <div className="capability-card__desc">
              Throughput, lead time, WIP, station utilization, buffer metrics, and quality
              indicators computed from simulation data.
            </div>
          </div>
          <div className="capability-card">
            <div className="capability-card__icon">💡</div>
            <div className="capability-card__title">Optimization Recommendations</div>
            <div className="capability-card__desc">
              Rule-based engine generates targeted improvement candidates with effort
              classification and expected impact assessment.
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section__title">Get Started</h2>
        <p className="section__subtitle">
          Explore pre-configured production scenarios or inspect the engine internals directly.
        </p>
        <div className="cta-group">
          <Link href="/demo" className="btn btn--primary btn--lg">
            Run Simulation Demo
          </Link>
          <Link href="/lab" className="btn btn--primary btn--lg">
            Operations Lab
          </Link>
          <Link href="/debug" className="btn btn--lg">
            Engine Inspector
          </Link>
        </div>
      </div>

      <hr className="divider" />

      <div className="section">
        <h2 className="section__title">Technical Foundation</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '640px', lineHeight: '1.6' }}>
          Built on spec v1.1 with support for deterministic defect accumulation,
          rework with max attempts, blocking and starvation modeling, multi-slot station capacity,
          shift and break scheduling, warmup periods, and cut-off termination. Bottleneck detection
          uses a composite weighted score across utilization, upstream queue pressure, downstream
          starvation impact, and inverse blocking contribution.
        </p>
      </div>
    </PageShell>
  );
}
