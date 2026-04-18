'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { PageShell } from '../../../components/PageShell';
import { KpiCard } from '../../../components/KpiCard';
import { StationTable } from '../../../components/StationTable';
import { LineView } from '../../../components/LineView';
import { RecommendationList } from '../../../components/RecommendationList';
import { getScenarioById, executeScenario } from '../../../lib/run-scenario';
import Link from 'next/link';

export default function ScenarioDetailPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = params.scenarioId;

  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const result = useMemo(() => (scenario ? executeScenario(scenario) : null), [scenario]);

  if (!scenario || !result) {
    return (
      <PageShell>
        <div className="hero">
          <h1 className="hero__title">Scenario not found</h1>
          <p className="hero__subtitle">
            No golden scenario with ID &ldquo;{scenarioId}&rdquo;.
          </p>
          <Link href="/demo" className="btn" style={{ marginTop: '1rem' }}>
            ← Back to Demo
          </Link>
        </div>
      </PageShell>
    );
  }

  const { summary, stationMetrics, bufferMetrics, bottleneck, recommendations, simulationTimeMs } =
    result;

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '0.5rem' }}>
        <Link href="/demo" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          ← Back to Demo
        </Link>
      </div>
      <div className="hero">
        <h1 className="hero__title">{scenario.name}</h1>
        <p className="hero__subtitle">{scenario.description}</p>
      </div>

      {/* KPIs */}
      <div className="section">
        <h2 className="section__title">Key Performance Indicators</h2>
        <div className="kpi-grid">
          <KpiCard label="Throughput" value={summary.throughput} unit="units/s" />
          <KpiCard label="Avg Lead Time" value={summary.averageLeadTime} unit="s" />
          <KpiCard label="Total Produced" value={summary.totalProduced} unit="units" />
          <KpiCard label="Average WIP" value={summary.averageWIP} unit="units" />
          <KpiCard label="Max WIP" value={summary.maxWIP} unit="units" />
          <KpiCard label="Total Scrapped" value={summary.totalScrapped} unit="units" />
          <KpiCard label="Total Reworked" value={summary.totalReworked} unit="cycles" />
          <KpiCard
            label="Bottleneck"
            value={
              scenario.lineModel.stations.find((s) => s.id === bottleneck.stationId)?.name ??
              bottleneck.stationId
            }
          />
        </div>
      </div>

      {/* Line Visualization */}
      <div className="section">
        <h2 className="section__title">Line View</h2>
        <LineView
          stations={scenario.lineModel.stations}
          buffers={scenario.lineModel.buffers}
          metrics={stationMetrics}
          bottleneckId={bottleneck.stationId}
        />
      </div>

      {/* Station Table */}
      <div className="section">
        <h2 className="section__title">Station Metrics</h2>
        <StationTable
          stations={scenario.lineModel.stations}
          metrics={stationMetrics}
          bottleneckId={bottleneck.stationId}
        />
      </div>

      {/* Buffers */}
      <div className="section">
        <h2 className="section__title">Buffer Metrics</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Buffer</th>
                <th>Capacity</th>
                <th>Avg Queue</th>
                <th>Max Queue</th>
                <th>Avg Wait Time</th>
              </tr>
            </thead>
            <tbody>
              {scenario.lineModel.buffers.map((buf, i) => {
                const bm = bufferMetrics[i];
                return (
                  <tr key={buf.id}>
                    <td>{buf.name}</td>
                    <td>{isFinite(buf.capacity) ? buf.capacity : '∞'}</td>
                    <td>{bm.averageQueueLength.toFixed(2)}</td>
                    <td>{bm.maxQueueLength}</td>
                    <td>{bm.averageWaitTime.toFixed(2)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift / Breaks */}
      <div className="section">
        <h2 className="section__title">Shift Configuration</h2>
        {scenario.lineModel.shifts.map((shift) => (
          <div key={shift.id} style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {shift.name} — {formatDuration(shift.duration)}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Break</th>
                  <th>Start Offset</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {shift.breaks.map((brk, j) => (
                  <tr key={j}>
                    <td>Break {j + 1}</td>
                    <td>{formatDuration(brk.startOffset)}</td>
                    <td>{formatDuration(brk.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Bottleneck Detail */}
      <div className="section">
        <h2 className="section__title">Bottleneck Analysis</h2>
        <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
          <KpiCard label="Station" value={bottleneck.stationId} />
          <KpiCard label="Score" value={bottleneck.score} />
          <KpiCard label="Confidence" value={`${(bottleneck.confidence * 100).toFixed(1)}%`} />
          <KpiCard label="Method" value={bottleneck.method} />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{bottleneck.explanation}</p>
      </div>

      {/* Recommendations */}
      <div className="section">
        <h2 className="section__title">Recommendations</h2>
        <RecommendationList recommendations={recommendations} />
      </div>

      {/* Engine Info */}
      <div className="section">
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          Simulation completed in {simulationTimeMs.toFixed(1)}ms · Config: {scenario.config.totalDuration}s
          total, {scenario.config.warmupDuration}s warmup, {scenario.config.numberOfShifts} shift(s)
        </p>
      </div>
    </PageShell>
  );
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}min`;
  }
  return `${seconds}s`;
}
