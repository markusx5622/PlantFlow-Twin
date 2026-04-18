import Link from 'next/link';
import { PageShell } from '../components/PageShell';
import { BlueprintGrid } from '../components/BlueprintGrid';

/* ── SVG icon components for engineering visual language ── */

function IconSimulation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="home-icon">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" />
    </svg>
  );
}

function IconBottleneck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="home-icon">
      <path d="M12 2v4M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="home-icon">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconOptimize() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="home-icon">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="18" cy="3" r="1" fill="currentColor" />
      <path d="M6 13l6-6 6 3" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="home-icon--inline">
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}

function IconLab() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="home-icon--inline">
      <path d="M6 2v5L2 13a1 1 0 001 1h10a1 1 0 001-1l-4-6V2" />
      <path d="M5 2h6" />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="home-icon--inline">
      <rect x="1" y="2" width="14" height="12" rx="2" />
      <polyline points="4 6 7 8 4 10" />
      <line x1="9" y1="10" x2="12" y2="10" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="home-icon--arrow">
      <path d="M2.5 6h7M6.5 3l3 3-3 3" />
    </svg>
  );
}

/* ── Data ── */

const TECH_BADGES = [
  { value: 'v1.1', label: 'Engine Spec' },
  { value: 'DES', label: 'Discrete Event' },
  { value: '100%', label: 'Deterministic' },
  { value: '<50ms', label: 'Sim Time' },
  { value: '7', label: 'Station Model' },
  { value: 'Real-time', label: 'Analytics' },
];

const CAPABILITIES = [
  {
    icon: <IconSimulation />,
    title: 'Discrete Event Simulation',
    desc: 'Deterministic DES engine with stations, buffers, shifts, breaks, defects, and rework. Fully reproducible results — no randomness.',
    tag: 'Core Engine',
  },
  {
    icon: <IconBottleneck />,
    title: 'Bottleneck Detection',
    desc: 'Composite scoring algorithm identifies the constraining station using utilization, queue depth, starvation, and blocking analysis.',
    tag: 'Analysis',
  },
  {
    icon: <IconAnalytics />,
    title: 'Production Analytics',
    desc: 'Throughput, lead time, WIP, station utilization, buffer metrics, and quality indicators computed from simulation data.',
    tag: 'KPIs',
  },
  {
    icon: <IconOptimize />,
    title: 'Optimization Recommendations',
    desc: 'Rule-based engine generates targeted improvement candidates with effort classification and expected impact assessment.',
    tag: 'Intelligence',
  },
];

const ENTRY_POINTS = [
  {
    href: '/demo',
    icon: <IconPlay />,
    title: 'Simulation Demo',
    desc: 'Run pre-configured production scenarios and explore full simulation results with KPIs, bottleneck analysis, and recommendations.',
    primary: true,
  },
  {
    href: '/lab',
    icon: <IconLab />,
    title: 'Operations Lab',
    desc: 'Clone scenarios, tweak parameters, compare variants side-by-side, and explore what-if analysis in a live experimentation environment.',
    primary: true,
  },
  {
    href: '/debug',
    icon: <IconTerminal />,
    title: 'Engine Inspector',
    desc: 'Inspect raw engine internals, event queues, station state, and timing data for full transparency into the simulation core.',
    primary: false,
  },
];

const TECH_SPECS = [
  'Deterministic defect accumulation with configurable rates',
  'Rework with max-attempt limits and overflow handling',
  'Blocking & starvation modeling across station chains',
  'Multi-slot station capacity for parallel processing',
  'Shift and break scheduling with warm-up periods',
  'Cut-off termination with graceful drain semantics',
  'Composite weighted bottleneck scoring (W_UTIL 0.35 · W_QUEUE 0.25 · W_STARVE 0.20 · W_BLOCK 0.20)',
  'Priority-ordered event queue with O(log n) insertion',
];

/* ── Page ── */

export default function HomePage() {
  return (
    <PageShell>
      {/* ── Hero with animated background ── */}
      <section className="home-hero">
        <BlueprintGrid />
        <div className="home-hero__content">
          <div className="home-hero__tagline">
            <span className="home-hero__tagline-dot" />
            Manufacturing Digital Twin · Process Intelligence Platform
          </div>

          <h1 className="home-hero__title">
            <span className="home-hero__title-line">PlantFlow</span>
            <span className="home-hero__title-accent">Twin</span>
          </h1>

          <p className="home-hero__subtitle">
            A deterministic process twin for manufacturing line simulation.
            Model production lines, detect bottlenecks, and generate actionable
            optimization strategies — all computed in real time, with full reproducibility.
          </p>

          {/* Tech badges row */}
          <div className="home-badges">
            {TECH_BADGES.map((b) => (
              <div key={b.label} className="home-badge">
                <span className="home-badge__value">{b.value}</span>
                <span className="home-badge__label">{b.label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="home-hero__ctas">
            <Link href="/demo" className="btn btn--primary btn--lg home-hero__cta">
              <IconPlay /> Run Simulation
            </Link>
            <Link href="/lab" className="btn btn--lg home-hero__cta">
              <IconLab /> Open Lab
            </Link>
          </div>
        </div>

        {/* Gradient fade at bottom of hero */}
        <div className="home-hero__fade" />
      </section>

      {/* ── Separator line ── */}
      <div className="home-separator">
        <div className="home-separator__line" />
        <span className="home-separator__label">Core Capabilities</span>
        <div className="home-separator__line" />
      </div>

      {/* ── Capabilities ── */}
      <section className="home-capabilities">
        <div className="home-capabilities__grid">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="home-cap-card">
              <div className="home-cap-card__head">
                <div className="home-cap-card__icon">{c.icon}</div>
                <span className="home-cap-card__tag">{c.tag}</span>
              </div>
              <h3 className="home-cap-card__title">{c.title}</h3>
              <p className="home-cap-card__desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Separator ── */}
      <div className="home-separator">
        <div className="home-separator__line" />
        <span className="home-separator__label">Entry Points</span>
        <div className="home-separator__line" />
      </div>

      {/* ── Entry Points ── */}
      <section className="home-entries">
        <div className="home-entries__grid">
          {ENTRY_POINTS.map((ep) => (
            <Link key={ep.href} href={ep.href} className="home-entry-card">
              <div className="home-entry-card__icon">{ep.icon}</div>
              <div className="home-entry-card__body">
                <h3 className="home-entry-card__title">
                  {ep.title}
                  <IconArrow />
                </h3>
                <p className="home-entry-card__desc">{ep.desc}</p>
              </div>
              {ep.primary && <div className="home-entry-card__accent" />}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Separator ── */}
      <div className="home-separator">
        <div className="home-separator__line" />
        <span className="home-separator__label">Technical Foundation</span>
        <div className="home-separator__line" />
      </div>

      {/* ── Tech Specs ── */}
      <section className="home-tech">
        <div className="home-tech__header">
          <div className="home-tech__label">Engine Specification v1.1</div>
          <div className="home-tech__sublabel">
            Built for deterministic, reproducible process simulation
          </div>
        </div>
        <ul className="home-tech__list">
          {TECH_SPECS.map((spec) => (
            <li key={spec} className="home-tech__item">
              <span className="home-tech__bullet" />
              {spec}
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
