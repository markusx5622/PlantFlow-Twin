'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageShell } from '../../components/PageShell';
import { KpiCard } from '../../components/KpiCard';
import { ParameterEditor } from '../../components/ParameterEditor';
import { ComparisonTable } from '../../components/ComparisonTable';
import { StationComparisonTable } from '../../components/StationComparisonTable';
import { ComparisonLineView } from '../../components/ComparisonLineView';
import { RecommendationList } from '../../components/RecommendationList';
import { getGoldenScenarios, executeScenario } from '../../lib/run-scenario';
import { createVariant, recommendationToEdit } from '../../lib/variant';
import { compareResults } from '../../lib/comparison';
import {
  formatThroughput,
  formatLeadTime,
  formatPct,
  formatDuration,
  stationDisplayName,
} from '../../lib/format';
import type { Scenario, SimulationResult, Recommendation } from '../../engine/types';
import type { ParameterEdit } from '../../lib/variant';

// ─── Lab State Persistence (lightweight, localStorage) ───

interface LabState {
  baselineId: string | null;
  edits: ParameterEdit[];
}

function saveLabState(state: LabState): void {
  try {
    localStorage.setItem('plantflow-lab-state', JSON.stringify(state));
  } catch {
    // localStorage unavailable — silent fallback
  }
}

function loadLabState(): LabState {
  try {
    const raw = localStorage.getItem('plantflow-lab-state');
    if (raw) return JSON.parse(raw) as LabState;
  } catch {
    // silent fallback
  }
  return { baselineId: null, edits: [] };
}

// ─── Main Lab Page ───

export default function LabPage() {
  const scenarios = useMemo(() => getGoldenScenarios(), []);
  const savedState = useMemo(() => loadLabState(), []);

  const [selectedId, setSelectedId] = useState<string | null>(savedState.baselineId);
  const [edits, setEdits] = useState<ParameterEdit[]>(savedState.edits);
  const [hasSimulated, setHasSimulated] = useState(false);

  // Find the selected baseline scenario
  const baseline = useMemo(
    () => scenarios.find((s) => s.id === selectedId) ?? null,
    [scenarios, selectedId],
  );

  // Run baseline simulation
  const baselineResult = useMemo(
    () => (baseline ? executeScenario(baseline) : null),
    [baseline],
  );

  // The variant + its result (only computed when user clicks Simulate)
  const [variantResult, setVariantResult] = useState<SimulationResult | null>(null);
  const [variantScenario, setVariantScenario] = useState<Scenario | null>(null);

  // Comparison
  const comparison = useMemo(() => {
    if (!baselineResult || !variantResult) return null;
    return compareResults(baselineResult, variantResult);
  }, [baselineResult, variantResult]);

  // ─── Handlers ───

  const handleSelectScenario = useCallback(
    (id: string) => {
      setSelectedId(id);
      setEdits([]);
      setHasSimulated(false);
      setVariantResult(null);
      setVariantScenario(null);
      saveLabState({ baselineId: id, edits: [] });
    },
    [],
  );

  const handleEditsChange = useCallback(
    (newEdits: ParameterEdit[]) => {
      setEdits(newEdits);
      setHasSimulated(false);
      saveLabState({ baselineId: selectedId, edits: newEdits });
    },
    [selectedId],
  );

  const handleSimulate = useCallback(() => {
    if (!baseline || edits.length === 0) return;
    const { variant } = createVariant(baseline, edits, 'Modified');
    const result = executeScenario(variant);
    setVariantScenario(variant);
    setVariantResult(result);
    setHasSimulated(true);
  }, [baseline, edits]);

  const handleApplyRecommendation = useCallback(
    (rec: Recommendation) => {
      if (!baseline) return;
      const edit = recommendationToEdit(rec.change);
      const newEdits = [...edits.filter(
        (e) => !(e.targetId === edit.targetId && e.field === edit.field),
      ), edit];
      setEdits(newEdits);

      // Auto-simulate
      const { variant } = createVariant(baseline, newEdits, rec.type.replace(/_/g, ' '));
      const result = executeScenario(variant);
      setVariantScenario(variant);
      setVariantResult(result);
      setHasSimulated(true);
      saveLabState({ baselineId: selectedId, edits: newEdits });
    },
    [baseline, edits, selectedId],
  );

  const handleReset = useCallback(() => {
    setEdits([]);
    setHasSimulated(false);
    setVariantResult(null);
    setVariantScenario(null);
    saveLabState({ baselineId: selectedId, edits: [] });
  }, [selectedId]);

  // ─── Render ───

  return (
    <PageShell>
      {/* Header */}
      <div className="hero">
        <div className="hero__eyebrow">Operations Lab</div>
        <h1 className="hero__title">What-If Analysis</h1>
        <p className="hero__subtitle">
          Select a production scenario, modify parameters, and simulate to compare
          baseline vs. variant performance. All results are computed from the real DES engine.
        </p>
      </div>

      {/* Step 1: Scenario Selection */}
      <div className="section">
        <h2 className="section__title">1 · Select Baseline Scenario</h2>
        <div className="lab-scenario-grid">
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`lab-scenario-btn${selectedId === s.id ? ' lab-scenario-btn--active' : ''}`}
              onClick={() => handleSelectScenario(s.id)}
            >
              <div className="lab-scenario-btn__name">{s.name}</div>
              <div className="lab-scenario-btn__meta">
                {s.lineModel.stations.length} stations · {formatDuration(s.config.totalDuration)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Show baseline KPIs when selected */}
      {baseline && baselineResult && (
        <>
          {/* Baseline Summary */}
          <div className="section">
            <h2 className="section__title">Baseline Performance</h2>
            <div className="kpi-grid">
              <KpiCard
                label="Throughput"
                value={formatThroughput(baselineResult.summary.throughput).value}
                unit={formatThroughput(baselineResult.summary.throughput).unit}
                highlight
              />
              <KpiCard
                label="Avg Lead Time"
                value={formatLeadTime(baselineResult.summary.averageLeadTime).value}
                unit={formatLeadTime(baselineResult.summary.averageLeadTime).unit}
              />
              <KpiCard
                label="Average WIP"
                value={baselineResult.summary.averageWIP}
                unit="units"
              />
              <KpiCard
                label="Bottleneck"
                value={
                  (() => {
                    const bnStation = baseline.lineModel.stations.find(
                      (s) => s.id === baselineResult.bottleneck.stationId,
                    );
                    return bnStation ? stationDisplayName(bnStation) : baselineResult.bottleneck.stationId;
                  })()
                }
                secondary={`Score: ${baselineResult.bottleneck.score.toFixed(4)}`}
              />
            </div>
          </div>

          {/* Step 2: Parameter Editor */}
          <div className="section">
            <h2 className="section__title">2 · Modify Parameters</h2>
            <p className="section__subtitle">
              Adjust station and buffer parameters to create a variant scenario.
              Changes are tracked against the baseline configuration.
            </p>
            <ParameterEditor
              stations={baseline.lineModel.stations}
              buffers={baseline.lineModel.buffers}
              edits={edits}
              onEditChange={handleEditsChange}
            />
          </div>

          {/* Simulate Button */}
          <div className="section">
            <div className="lab-actions">
              <button
                className="btn btn--primary btn--lg"
                onClick={handleSimulate}
                disabled={edits.length === 0}
              >
                {hasSimulated ? '↻ Re-simulate Variant' : '▶ Simulate Variant'}
              </button>
              <span className="lab-actions__info">
                {edits.length === 0
                  ? 'Modify at least one parameter to simulate'
                  : `${edits.length} parameter${edits.length > 1 ? 's' : ''} modified`}
              </span>
              {hasSimulated && (
                <button className="btn" onClick={handleReset}>
                  Reset Variant
                </button>
              )}
            </div>
          </div>

          {/* Step 3: Recommendations (apply as variant) */}
          {baselineResult.recommendations.length > 0 && (
            <div className="section">
              <h2 className="section__title">Engine Recommendations</h2>
              <p className="section__subtitle">
                Apply a recommendation to instantly generate and simulate a variant scenario.
              </p>
              <div className="rec-list">
                {baselineResult.recommendations.map((rec) => {
                  const station = baseline.lineModel.stations.find(
                    (st) => st.id === rec.targetId,
                  );
                  const targetName = station?.name ?? rec.targetId;

                  return (
                    <div key={rec.id} className="rec-item">
                      <div className="rec-item__header">
                        <span
                          className={`rec-item__type rec-item__type--${rec.effort.toLowerCase()}`}
                        >
                          {rec.effort}
                        </span>
                      </div>
                      <div className="rec-item__title">
                        {rec.type.replace(/_/g, ' ')}
                      </div>
                      <div className="rec-item__target">
                        Target: {targetName} · {rec.change.field}: {String(rec.change.oldValue)} → {String(rec.change.newValue)}
                      </div>
                      <div className="rec-item__rationale">{rec.rationale}</div>
                      <div style={{ marginTop: 'var(--space-md)' }}>
                        <button
                          className="btn btn--primary"
                          onClick={() => handleApplyRecommendation(rec)}
                        >
                          ▶ Apply as Variant
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Comparison Results */}
          {hasSimulated && comparison && variantResult && variantScenario && (
            <>
              <hr className="divider" />

              <div className="section">
                <div className="lab-comparison-header">
                  <h2 className="section__title">3 · Comparison: Baseline vs Variant</h2>
                  <div className="lab-comparison-badge">
                    <span className="badge badge--blue">
                      {edits.length} change{edits.length > 1 ? 's' : ''} applied
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Comparison */}
              <div className="section">
                <h2 className="section__title">KPI Impact</h2>
                <ComparisonTable kpis={comparison.kpis} />
              </div>

              {/* Variant KPIs */}
              <div className="section">
                <h2 className="section__title">Variant Performance</h2>
                <div className="kpi-grid">
                  <KpiCard
                    label="Throughput"
                    value={formatThroughput(variantResult.summary.throughput).value}
                    unit={formatThroughput(variantResult.summary.throughput).unit}
                    highlight
                    secondary={`Δ ${comparison.kpis[0].percentDelta > 0 ? '+' : ''}${comparison.kpis[0].percentDelta.toFixed(1)}%`}
                  />
                  <KpiCard
                    label="Avg Lead Time"
                    value={formatLeadTime(variantResult.summary.averageLeadTime).value}
                    unit={formatLeadTime(variantResult.summary.averageLeadTime).unit}
                    secondary={`Δ ${comparison.kpis[1].percentDelta > 0 ? '+' : ''}${comparison.kpis[1].percentDelta.toFixed(1)}%`}
                  />
                  <KpiCard
                    label="Average WIP"
                    value={variantResult.summary.averageWIP}
                    unit="units"
                    secondary={`Δ ${comparison.kpis[2].percentDelta > 0 ? '+' : ''}${comparison.kpis[2].percentDelta.toFixed(1)}%`}
                  />
                  <KpiCard
                    label="Bottleneck"
                    value={
                      (() => {
                        const bnStation = baseline.lineModel.stations.find(
                          (s) => s.id === variantResult.bottleneck.stationId,
                        );
                        return bnStation ? stationDisplayName(bnStation) : variantResult.bottleneck.stationId;
                      })()
                    }
                    secondary={comparison.bottleneckChanged ? '⚠ Shifted' : 'Unchanged'}
                  />
                </div>
              </div>

              {/* Utilization per Station */}
              <div className="section">
                <h2 className="section__title">Station Utilization Comparison</h2>
                <StationComparisonTable
                  stations={baseline.lineModel.stations}
                  comparisons={comparison.stations}
                  bottleneckChanged={comparison.bottleneckChanged}
                />
              </div>

              {/* Comparative Line View */}
              <div className="section">
                <h2 className="section__title">Line Visualization</h2>
                <ComparisonLineView
                  stations={baseline.lineModel.stations}
                  buffers={baseline.lineModel.buffers}
                  baselineMetrics={baselineResult.stationMetrics}
                  variantMetrics={variantResult.stationMetrics}
                  baselineBottleneckId={baselineResult.bottleneck.stationId}
                  variantBottleneckId={variantResult.bottleneck.stationId}
                />
              </div>

              {/* Engine Info */}
              <div className="section">
                <div className="engine-meta">
                  <span>Baseline: {baselineResult.simulationTimeMs.toFixed(1)}ms</span>
                  <span>Variant: {variantResult.simulationTimeMs.toFixed(1)}ms</span>
                  <span>Duration: {formatDuration(baseline.config.totalDuration)}</span>
                  <span>Engine: DES v1.1</span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
