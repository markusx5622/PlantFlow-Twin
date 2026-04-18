// ─── Recommendation Engine Scope Tests (Spec v1.1) ───
// Verifies Block 1 recommendation engine stays in scope:
// - Identifies candidate recommendations
// - Prepares ScenarioChange structs
// - Does NOT fabricate re-simulated impact numbers
import { describe, it, expect, beforeEach } from 'vitest';
import { generateRecommendations, resetRecommendationIds } from '../../src/engine/recommendations';
import { detectBottleneck } from '../../src/engine/bottleneck';
import {
  StationMetrics,
  BufferMetrics,
  LineModel,
  BottleneckResult,
} from '../../src/engine/types';

function makeMetrics(
  stationId: string,
  util: number,
  blocking: number,
  starvation: number,
): StationMetrics {
  return {
    stationId,
    utilization: util,
    blockingRate: blocking,
    starvationRate: starvation,
    effectiveCycleTime: 10,
    totalProcessed: 100,
    totalScrapped: 5,
    totalReworked: 3,
  };
}

function makeBufferMetrics(id: string, avgQueue: number): BufferMetrics {
  return {
    bufferId: id,
    averageQueueLength: avgQueue,
    maxQueueLength: Math.ceil(avgQueue * 2),
    averageWaitTime: avgQueue * 5,
  };
}

const testModel: LineModel = {
  id: 'test',
  name: 'Test',
  stations: [
    { id: 's1', name: 'Station A', cycleTime: 10, availability: 0.90, defectRate: 0.05, maxReworkAttempts: 1, capacity: 1 },
    { id: 's2', name: 'Station B', cycleTime: 15, availability: 0.95, defectRate: 0.02, maxReworkAttempts: 0, capacity: 1 },
  ],
  buffers: [
    { id: 'b1', name: 'Buffer 1', capacity: 10 },
  ],
  shifts: [],
};

describe('Recommendation Engine — Spec v1.1 Scope', () => {
  beforeEach(() => resetRecommendationIds());

  it('generates ScenarioChange structs with old/new values', () => {
    const stationMetrics = [
      makeMetrics('s1', 0.85, 0.05, 0.10),
      makeMetrics('s2', 0.70, 0.10, 0.20),
    ];
    const bufferMetrics = [makeBufferMetrics('b1', 3)];
    const bottleneck = detectBottleneck(stationMetrics, bufferMetrics, testModel);

    const recs = generateRecommendations(stationMetrics, bufferMetrics, bottleneck, testModel);
    expect(recs.length).toBeGreaterThan(0);

    for (const rec of recs) {
      // Every recommendation must have a valid ScenarioChange
      expect(rec.change).toBeDefined();
      expect(rec.change.type).toBeTruthy();
      expect(rec.change.targetId).toBeTruthy();
      expect(rec.change.field).toBeTruthy();
      expect(rec.change.oldValue).toBeDefined();
      expect(rec.change.newValue).toBeDefined();
      // Old and new must differ
      expect(rec.change.oldValue).not.toBe(rec.change.newValue);
    }
  });

  it('expectedImprovement is a descriptive string, NOT a simulated number', () => {
    const stationMetrics = [
      makeMetrics('s1', 0.90, 0.02, 0.08),
      makeMetrics('s2', 0.60, 0.10, 0.30),
    ];
    const bufferMetrics = [makeBufferMetrics('b1', 5)];
    const bottleneck = detectBottleneck(stationMetrics, bufferMetrics, testModel);

    const recs = generateRecommendations(stationMetrics, bufferMetrics, bottleneck, testModel);

    for (const rec of recs) {
      // expectedImprovement must be a string description
      expect(typeof rec.expectedImprovement).toBe('string');
      expect(rec.expectedImprovement.length).toBeGreaterThan(0);

      // Must NOT look like a bare number (which would suggest fabricated simulation results)
      expect(Number.isFinite(Number(rec.expectedImprovement))).toBe(false);
    }
  });

  it('does not include re-simulated throughput or lead time numbers', () => {
    const stationMetrics = [
      makeMetrics('s1', 0.92, 0.03, 0.05),
      makeMetrics('s2', 0.65, 0.05, 0.30),
    ];
    const bufferMetrics = [makeBufferMetrics('b1', 4)];
    const bottleneck = detectBottleneck(stationMetrics, bufferMetrics, testModel);

    const recs = generateRecommendations(stationMetrics, bufferMetrics, bottleneck, testModel);

    for (const rec of recs) {
      // The recommendation should not claim to know exact post-change throughput
      // (that requires re-simulation, which is Block 2 scope)
      const improvement = rec.expectedImprovement.toLowerCase();
      expect(improvement).not.toMatch(/throughput\s*=\s*\d/);
      expect(improvement).not.toMatch(/lead\s*time\s*=\s*\d/);
    }
  });

  it('each recommendation has a unique id, type, priority, effort, and rationale', () => {
    const stationMetrics = [
      makeMetrics('s1', 0.90, 0.02, 0.08),
      makeMetrics('s2', 0.60, 0.10, 0.30),
    ];
    const bufferMetrics = [makeBufferMetrics('b1', 5)];
    const bottleneck = detectBottleneck(stationMetrics, bufferMetrics, testModel);

    const recs = generateRecommendations(stationMetrics, bufferMetrics, bottleneck, testModel);

    const ids = new Set<string>();
    for (const rec of recs) {
      expect(rec.id).toBeTruthy();
      expect(ids.has(rec.id)).toBe(false); // unique
      ids.add(rec.id);

      expect(rec.type).toBeTruthy();
      expect(rec.priority).toBeGreaterThan(0);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(rec.effort);
      expect(rec.rationale.length).toBeGreaterThan(10);
    }
  });

  it('ScenarioChange types are valid for clone→apply→re-simulate pattern', () => {
    const stationMetrics = [
      makeMetrics('s1', 0.90, 0.02, 0.08),
      makeMetrics('s2', 0.60, 0.10, 0.30),
    ];
    const bufferMetrics = [makeBufferMetrics('b1', 5)];
    const bottleneck = detectBottleneck(stationMetrics, bufferMetrics, testModel);

    const recs = generateRecommendations(stationMetrics, bufferMetrics, bottleneck, testModel);

    const validTypes = ['MODIFY_STATION', 'MODIFY_BUFFER', 'ADD_STATION', 'REMOVE_STATION'];
    for (const rec of recs) {
      expect(validTypes).toContain(rec.change.type);
    }
  });
});
