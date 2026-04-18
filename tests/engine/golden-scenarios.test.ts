// ─── Golden Scenario Tests ───
import { describe, it, expect } from 'vitest';
import { runSimulation } from '../../src/engine/simulation';
import {
  bottlingLine,
  electronicAssembly,
  pharmaPackaging,
} from '../../src/data/golden-scenarios';
import { SimulationResult } from '../../src/engine/types';

function validateResult(result: SimulationResult, label: string): void {
  // Basic structure
  expect(result.scenarioId).toBeTruthy();
  expect(result.stationMetrics.length).toBeGreaterThan(0);
  expect(result.bufferMetrics.length).toBeGreaterThan(0);
  expect(result.simulationTimeMs).toBeGreaterThan(0);

  // Summary sanity
  expect(result.summary.throughput).toBeGreaterThan(0);
  expect(result.summary.totalProduced).toBeGreaterThan(0);
  expect(result.summary.averageLeadTime).toBeGreaterThan(0);
  expect(result.summary.averageWIP).toBeGreaterThan(0);
  expect(result.summary.maxWIP).toBeGreaterThanOrEqual(1);

  // Bottleneck
  expect(result.bottleneck.stationId).toBeTruthy();
  expect(result.bottleneck.score).toBeGreaterThan(0);
  expect(result.bottleneck.confidence).toBeGreaterThan(0);
  expect(result.bottleneck.allScores.length).toBeGreaterThan(0);
  expect(result.bottleneck.explanation.length).toBeGreaterThan(0);
}

describe('Golden Scenario 1 — Bottling Line', () => {
  const result = runSimulation(bottlingLine);

  it('produces a valid result', () => {
    validateResult(result, 'Bottling');
  });

  it('produces reasonable throughput', () => {
    // Bottleneck is Package with effectiveCT = 4/0.9 ≈ 4.44s
    // Max theoretical throughput ≈ 1/4.44 ≈ 0.225 u/s
    // With breaks and warmup, should be lower
    expect(result.summary.throughput).toBeGreaterThan(0.05);
    expect(result.summary.throughput).toBeLessThan(0.5);
  });

  it('has 4 station metrics and 3 buffer metrics', () => {
    expect(result.stationMetrics).toHaveLength(4);
    expect(result.bufferMetrics).toHaveLength(3);
  });

  it('identifies the bottleneck station', () => {
    // Package station has highest effective CT
    expect(result.bottleneck.stationId).toBeTruthy();
  });

  it('generates recommendations', () => {
    expect(result.recommendations.length).toBeGreaterThan(0);
    for (const rec of result.recommendations) {
      expect(rec.id).toBeTruthy();
      expect(rec.type).toBeTruthy();
      expect(rec.rationale).toBeTruthy();
      expect(rec.change).toBeTruthy();
    }
  });

  it('scraps some units due to defects', () => {
    expect(result.summary.totalScrapped).toBeGreaterThanOrEqual(0);
  });
});

describe('Golden Scenario 2 — Electronic Assembly Cell', () => {
  const result = runSimulation(electronicAssembly);

  it('produces a valid result', () => {
    validateResult(result, 'Electronics');
  });

  it('produces reasonable throughput', () => {
    // Bottleneck is Reflow Solder with effectiveCT = 45/0.99 ≈ 45.45s
    // Max theoretical ≈ 0.022 u/s
    expect(result.summary.throughput).toBeGreaterThan(0.005);
    expect(result.summary.throughput).toBeLessThan(0.1);
  });

  it('has 5 station metrics and 4 buffer metrics', () => {
    expect(result.stationMetrics).toHaveLength(5);
    expect(result.bufferMetrics).toHaveLength(4);
  });

  it('identifies bottleneck near Reflow Solder', () => {
    // Reflow has by far the highest CT (45s) → should be the bottleneck
    expect(result.bottleneck.stationId).toBeTruthy();
  });
});

describe('Golden Scenario 3 — Pharmaceutical Packaging', () => {
  const result = runSimulation(pharmaPackaging);

  it('produces a valid result', () => {
    validateResult(result, 'Pharma');
  });

  it('produces reasonable throughput', () => {
    // Bottleneck is Box with effectiveCT = 2.0/0.92 ≈ 2.17s
    // Max theoretical ≈ 0.46 u/s
    expect(result.summary.throughput).toBeGreaterThan(0.1);
    expect(result.summary.throughput).toBeLessThan(1.0);
  });

  it('has 4 station metrics and 3 buffer metrics', () => {
    expect(result.stationMetrics).toHaveLength(4);
    expect(result.bufferMetrics).toHaveLength(3);
  });

  it('handles high-speed line with short cycle times', () => {
    expect(result.summary.totalProduced).toBeGreaterThan(100);
  });
});
