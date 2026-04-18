'use client';

import { useMemo } from 'react';
import { PageShell } from '../../components/PageShell';
import { KpiCard } from '../../components/KpiCard';
import { runAllGoldenScenarios } from '../../lib/run-scenario';
import { stationDisplayName, formatPct, formatConfidence } from '../../lib/format';

export default function DebugPage() {
  const results = useMemo(() => runAllGoldenScenarios(), []);

  return (
    <PageShell>
      <div className="hero">
        <div className="hero__eyebrow">Engine Inspector</div>
        <h1 className="hero__title">Debug Console</h1>
        <p className="hero__subtitle">
          Technical inspector — verifies the DES engine produces deterministic results
          for all configured scenarios. All raw values shown here.
        </p>
      </div>

      <div className="section">
        <h2 className="section__title">Engine Status</h2>
        <div className="kpi-grid">
          <KpiCard label="Engine" value="Active" />
          <KpiCard label="Scenarios" value={results.length} />
          <KpiCard label="Mode" value="Deterministic" />
          <KpiCard label="Spec" value="v1.1" />
        </div>
      </div>

      {results.map(({ scenario, result }) => {
        const conf = formatConfidence(result.bottleneck.confidence);
        const bnStation = scenario.lineModel.stations.find(
          (s) => s.id === result.bottleneck.stationId,
        );

        return (
          <div key={scenario.id} className="debug-scenario">
            <h3 className="debug-scenario__title">
              {scenario.name}{' '}
              <span className="badge badge--blue">{scenario.id}</span>
            </h3>

            <div className="section">
              <h4 className="section__title" style={{ fontSize: '0.8125rem' }}>Summary</h4>
              <div className="debug-kv">
                <span className="debug-kv__key">Throughput</span>
                <span className="debug-kv__value">
                  {result.summary.throughput.toFixed(4)} units/s ({(result.summary.throughput * 3600).toFixed(1)} units/hr)
                </span>
                <span className="debug-kv__key">Avg Lead Time</span>
                <span className="debug-kv__value">{result.summary.averageLeadTime.toFixed(2)}s</span>
                <span className="debug-kv__key">Total Produced</span>
                <span className="debug-kv__value">{result.summary.totalProduced.toLocaleString()}</span>
                <span className="debug-kv__key">Total Scrapped</span>
                <span className="debug-kv__value">{result.summary.totalScrapped.toLocaleString()}</span>
                <span className="debug-kv__key">Total Reworked</span>
                <span className="debug-kv__value">{result.summary.totalReworked.toLocaleString()}</span>
                <span className="debug-kv__key">Average WIP</span>
                <span className="debug-kv__value">{result.summary.averageWIP.toFixed(2)}</span>
                <span className="debug-kv__key">Max WIP</span>
                <span className="debug-kv__value">{result.summary.maxWIP}</span>
                <span className="debug-kv__key">Sim Time</span>
                <span className="debug-kv__value">{result.simulationTimeMs.toFixed(1)}ms</span>
              </div>
            </div>

            <div className="section">
              <h4 className="section__title" style={{ fontSize: '0.8125rem' }}>Station Metrics</h4>
              <div className="data-table__wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Station</th>
                      <th>Util</th>
                      <th>Block</th>
                      <th>Starve</th>
                      <th>Eff. CT</th>
                      <th>Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.stationMetrics.map((m) => {
                      const station = scenario.lineModel.stations.find((s) => s.id === m.stationId);
                      const name = station ? stationDisplayName(station) : m.stationId;
                      return (
                        <tr key={m.stationId}>
                          <td>
                            {name}
                            {m.stationId === result.bottleneck.stationId && (
                              <> <span className="badge badge--red">BN</span></>
                            )}
                          </td>
                          <td>{formatPct(m.utilization)}</td>
                          <td>{formatPct(m.blockingRate)}</td>
                          <td>{formatPct(m.starvationRate)}</td>
                          <td>{m.effectiveCycleTime.toFixed(2)}s</td>
                          <td>{m.totalProcessed.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section">
              <h4 className="section__title" style={{ fontSize: '0.8125rem' }}>Bottleneck</h4>
              <div className="debug-kv">
                <span className="debug-kv__key">Station</span>
                <span className="debug-kv__value">
                  {bnStation ? stationDisplayName(bnStation) : result.bottleneck.stationId}
                  {' '}
                  <span style={{ color: 'var(--text-dim)' }}>({result.bottleneck.stationId})</span>
                </span>
                <span className="debug-kv__key">Score</span>
                <span className="debug-kv__value">{result.bottleneck.score}</span>
                <span className="debug-kv__key">Confidence</span>
                <span className="debug-kv__value">
                  {formatPct(result.bottleneck.confidence)} — {conf.label}
                </span>
                <span className="debug-kv__key">Method</span>
                <span className="debug-kv__value">{result.bottleneck.method}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {result.bottleneck.explanation}
              </p>
            </div>

            <div className="section" style={{ marginBottom: 0 }}>
              <h4 className="section__title" style={{ fontSize: '0.8125rem' }}>
                Recommendations ({result.recommendations.length})
              </h4>
              {result.recommendations.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>None</p>
              ) : (
                <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', paddingLeft: '1.25rem' }}>
                  {result.recommendations.map((rec) => (
                    <li key={rec.id} style={{ marginBottom: '0.25rem' }}>
                      <strong>[{rec.effort}]</strong> {rec.type.replace(/_/g, ' ')} → {rec.expectedImprovement}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}

      <div className="section">
        <h2 className="section__title">Raw Scores (Debug)</h2>
        <pre>
          {JSON.stringify(
            results.map(({ scenario, result }) => ({
              scenario: scenario.id,
              bottleneckScores: result.bottleneck.allScores,
            })),
            null,
            2,
          )}
        </pre>
      </div>
    </PageShell>
  );
}
