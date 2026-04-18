// ─── Invariant Tests ───
// Validates structural and mathematical invariants of the simulation.
import { describe, it, expect } from 'vitest';
import { runSimulation } from '../../src/engine/simulation';
import {
  bottlingLine,
  electronicAssembly,
  pharmaPackaging,
} from '../../src/data/golden-scenarios';
import { Scenario, SimulationResult } from '../../src/engine/types';

function makeMinimalScenario(): Scenario {
  return {
    id: 'inv-test',
    name: 'Invariant Test',
    description: 'Simple line for invariant testing',
    lineModel: {
      id: 'lm-inv',
      name: 'Inv Line',
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 0.95, defectRate: 0.05, maxReworkAttempts: 1, capacity: 1 },
        { id: 's2', name: 'S2', cycleTime: 15, availability: 0.90, defectRate: 0.02, maxReworkAttempts: 0, capacity: 1 },
        { id: 's3', name: 'S3', cycleTime: 8, availability: 0.98, defectRate: 0.01, maxReworkAttempts: 2, capacity: 1 },
      ],
      buffers: [
        { id: 'b1', name: 'B1', capacity: 5 },
        { id: 'b2', name: 'B2', capacity: 5 },
      ],
      shifts: [{
        id: 'sh1',
        name: 'Test Shift',
        duration: 3600,
        breaks: [{ startOffset: 1800, duration: 300 }],
      }],
    },
    config: {
      totalDuration: 3600,
      warmupDuration: 300,
      numberOfShifts: 1,
    },
  };
}

const scenarios: [string, Scenario][] = [
  ['Minimal', makeMinimalScenario()],
  ['Bottling', bottlingLine],
  ['Electronics', electronicAssembly],
  ['Pharma', pharmaPackaging],
];

describe('Invariants', () => {
  for (const [name, scenario] of scenarios) {
    describe(name, () => {
      const result = runSimulation(scenario);

      it('utilization + blockingRate + starvationRate ≈ 1.0 for each station', () => {
        for (const sm of result.stationMetrics) {
          const sum = sm.utilization + sm.blockingRate + sm.starvationRate;
          expect(sum).toBeGreaterThan(0.9);
          expect(sum).toBeLessThan(1.1);
        }
      });

      it('no infinite rework (all units are finite)', () => {
        // If the simulation completes in finite time, this is satisfied
        expect(result.simulationTimeMs).toBeLessThan(30000); // < 30s
        expect(result.summary.totalProduced + result.summary.totalScrapped).toBeGreaterThan(0);
      });

      it('buffers never exceed capacity', () => {
        for (let i = 0; i < result.bufferMetrics.length; i++) {
          const bm = result.bufferMetrics[i];
          const cap = scenario.lineModel.buffers[i].capacity;
          expect(bm.maxQueueLength).toBeLessThanOrEqual(cap);
        }
      });

      it('throughput is non-negative', () => {
        expect(result.summary.throughput).toBeGreaterThanOrEqual(0);
      });

      it('totalProduced and totalScrapped are non-negative', () => {
        expect(result.summary.totalProduced).toBeGreaterThanOrEqual(0);
        expect(result.summary.totalScrapped).toBeGreaterThanOrEqual(0);
      });

      it('WIP is non-negative', () => {
        expect(result.summary.averageWIP).toBeGreaterThanOrEqual(0);
        expect(result.summary.maxWIP).toBeGreaterThanOrEqual(0);
      });

      it('lead time is non-negative', () => {
        expect(result.summary.averageLeadTime).toBeGreaterThanOrEqual(0);
      });

      it('station effective CT is positive for stations with processed units', () => {
        for (const sm of result.stationMetrics) {
          if (sm.totalProcessed > 0) {
            expect(sm.effectiveCycleTime).toBeGreaterThan(0);
          }
        }
      });

      it('buffer average queue length is non-negative', () => {
        for (const bm of result.bufferMetrics) {
          expect(bm.averageQueueLength).toBeGreaterThanOrEqual(0);
        }
      });
    });
  }
});
