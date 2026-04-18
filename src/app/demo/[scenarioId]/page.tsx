'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { PageShell } from '../../../components/PageShell';
import { KpiCard } from '../../../components/KpiCard';
import { StationTable } from '../../../components/StationTable';
import { LineView } from '../../../components/LineView';
import { RecommendationList } from '../../../components/RecommendationList';
import { getScenarioById, executeScenario } from '../../../lib/run-scenario';
import {
  formatThroughput,
  formatLeadTime,
  formatConfidence,
  formatPct,
  formatWaitTime,
  formatDuration,
  stationDisplayName,
  bufferDisplayName,
} from '../../../lib/format';
import Link from 'next/link';
import type { ConfidenceDisplay } from '../../../lib/format';

function confidenceBadgeClass(color: ConfidenceDisplay['color']): string {
  switch (color) {
    case 'success': return 'green';
    case 'warning': return 'yellow';
    case 'danger': return 'red';
  }
}

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
            No scenario with ID &ldquo;{scenarioId}&rdquo; was found.
          </p>
          <Link href="/demo" className="btn" style={{ marginTop: '1rem' }}>
            ← Back to Scenarios
          </Link>
        </div>
      </PageShell>
    );
  }

  const { summary, stationMetrics, bufferMetrics, bottleneck, recommendations, simulationTimeMs } =
    result;

  const tp = formatThroughput(summary.throughput);
  const lt = formatLeadTime(summary.averageLeadTime);
  const conf = formatConfidence(bottleneck.confidence);
  const bnStation = scenario.lineModel.stations.find((s) => s.id === bottleneck.stationId);
  const bnDisplayName = bnStation ? stationDisplayName(bnStation) : bottleneck.stationId;

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/demo">Scenarios</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-dim)' }}>/</span>
        <span style={{ color: 'var(--text-muted)' }}>{scenario.name}</span>
      </div>

      {/* Header */}
      <div className="hero">
        <div className="hero__eyebrow">Simulation Results</div>
        <h1 className="hero__title">{scenario.name}</h1>
        <p className="hero__subtitle">{scenario.description}</p>
      </div>

      {/* Primary KPIs */}
      <div className="section">
        <h2 className="section__title">Key Performance Indicators</h2>
        <div className="kpi-grid">
          <KpiCard
            label="Throughput"
            value={tp.value}
            unit={tp.unit}
            secondary={`${summary.throughput.toFixed(4)} units/s`}
            highlight
          />
          <KpiCard
            label="Avg Lead Time"
            value={lt.value}
            unit={lt.unit}
            secondary={`${summary.averageLeadTime.toFixed(1)}s total`}
          />
          <KpiCard
            label="Total Produced"
            value={summary.totalProduced}
            unit="units"
          />
          <KpiCard
            label="Average WIP"
            value={summary.averageWIP}
            unit="units"
          />
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="section">
        <h2 className="section__title">Quality & Inventory</h2>
        <div className="kpi-grid">
          <KpiCard label="Max WIP" value={summary.maxWIP} unit="units" />
          <KpiCard label="Total Scrapped" value={summary.totalScrapped} unit="units" />
          <KpiCard label="Total Reworked" value={summary.totalReworked} unit="cycles" />
          <KpiCard
            label="Yield Rate"
            value={
              summary.totalProduced > 0
                ? formatPct(summary.totalProduced / (summary.totalProduced + summary.totalScrapped))
                : 'N/A'
            }
          />
        </div>
      </div>

      {/* Bottleneck Analysis */}
      <div className="section">
        <h2 className="section__title">Bottleneck Analysis</h2>
        <div className="bn-card">
          <div className="bn-card__header">
            <span className="bn-card__station">{bnDisplayName}</span>
            <span className={`badge badge--${confidenceBadgeClass(conf.color)}`}>
              {conf.label}
            </span>
          </div>
          <div className="bn-card__metrics">
            <div className="bn-card__metric">
              <span className="bn-card__metric-label">Score</span>
              <span className="bn-card__metric-value">{bottleneck.score.toFixed(4)}</span>
            </div>
            <div className="bn-card__metric">
              <span className="bn-card__metric-label">Method</span>
              <span className="bn-card__metric-value" style={{ fontSize: '0.8125rem' }}>
                Composite v1
              </span>
            </div>
            {bnStation && (
              <>
                <div className="bn-card__metric">
                  <span className="bn-card__metric-label">Utilization</span>
                  <span className="bn-card__metric-value">
                    {formatPct(stationMetrics.find((m) => m.stationId === bnStation.id)?.utilization ?? 0)}
                  </span>
                </div>
                <div className="bn-card__metric">
                  <span className="bn-card__metric-label">Cycle Time</span>
                  <span className="bn-card__metric-value">{bnStation.cycleTime}s</span>
                </div>
              </>
            )}
          </div>
          <div className="bn-card__explanation">{bottleneck.explanation}</div>
        </div>
      </div>

      {/* Line Visualization */}
      <div className="section">
        <h2 className="section__title">Production Line</h2>
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
        <div className="data-table__wrap">
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
                    <td>{bufferDisplayName(buf)}</td>
                    <td>{isFinite(buf.capacity) ? buf.capacity : '∞'}</td>
                    <td>{bm.averageQueueLength.toFixed(2)}</td>
                    <td>{bm.maxQueueLength}</td>
                    <td>{formatWaitTime(bm.averageWaitTime)}</td>
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
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>
              {shift.name} — {formatDuration(shift.duration)}
            </div>
            <div className="data-table__wrap">
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
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="section">
        <h2 className="section__title">
          Optimization Recommendations
          {recommendations.length > 0 && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
              ({recommendations.length} {recommendations.length === 1 ? 'suggestion' : 'suggestions'})
            </span>
          )}
        </h2>
        <RecommendationList
          recommendations={recommendations}
          stations={scenario.lineModel.stations}
        />
      </div>

      {/* Engine Info */}
      <div className="section">
        <div className="engine-meta">
          <span>Simulation: {simulationTimeMs.toFixed(1)}ms</span>
          <span>Duration: {formatDuration(scenario.config.totalDuration)}</span>
          <span>Warmup: {formatDuration(scenario.config.warmupDuration)}</span>
          <span>Shifts: {scenario.config.numberOfShifts}</span>
          <span>Engine: DES v1.1</span>
        </div>
      </div>
    </PageShell>
  );
}
