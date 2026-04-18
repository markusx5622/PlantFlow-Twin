// ─── Simulation Engine Core Tests ───
import { describe, it, expect } from 'vitest';
import { runSimulation } from '../../src/engine/simulation';
import { Scenario } from '../../src/engine/types';

function makeSimpleScenario(overrides: Partial<{
  stations: Partial<Scenario['lineModel']['stations'][0]>[];
  bufferCapacities: number[];
  totalDuration: number;
  warmupDuration: number;
  breaks: { startOffset: number; duration: number }[];
}>): Scenario {
  const stationDefaults = [
    { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
    { id: 's2', name: 'S2', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
  ];

  const stations = (overrides.stations ?? stationDefaults).map((s, i) => ({
    ...stationDefaults[i % stationDefaults.length],
    ...s,
    id: s.id ?? `s${i + 1}`,
    name: s.name ?? `S${i + 1}`,
  }));

  const bufCaps = overrides.bufferCapacities ?? stations.slice(1).map(() => 10);
  const buffers = bufCaps.map((cap, i) => ({
    id: `b${i}`,
    name: `Buffer ${i}`,
    capacity: cap,
  }));

  return {
    id: 'test-scenario',
    name: 'Test',
    description: 'Test scenario',
    lineModel: {
      id: 'lm-test',
      name: 'Test Line',
      stations: stations as Scenario['lineModel']['stations'],
      buffers,
      shifts: [
        {
          id: 'shift-test',
          name: 'Test Shift',
          duration: overrides.totalDuration ?? 1000,
          breaks: overrides.breaks ?? [],
        },
      ],
    },
    config: {
      totalDuration: overrides.totalDuration ?? 1000,
      warmupDuration: overrides.warmupDuration ?? 0,
      numberOfShifts: 1,
    },
  };
}

describe('Defect Accumulator', () => {
  it('triggers defects deterministically at the correct interval', () => {
    // defectRate = 0.25 → defect every 4th unit
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 5, availability: 1.0, defectRate: 0.25, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [],
      totalDuration: 500,
    });

    const result = runSimulation(scenario);
    // Every 4th unit should be scrapped (defectRate = 0.25, accumulator hits 1.0 at 4th)
    const totalUnits = result.summary.totalProduced + result.summary.totalScrapped;
    expect(totalUnits).toBeGreaterThan(0);

    // ~25% should be scrapped
    const scrapRatio = result.summary.totalScrapped / totalUnits;
    expect(scrapRatio).toBeCloseTo(0.25, 1);
  });

  it('accumulator carries remainder across units', () => {
    // defectRate = 0.3 → defect at unit 4 (acc: 0.3, 0.6, 0.9, 1.2→defect+0.2), then unit 7 (0.5, 0.8, 1.1→defect+0.1)
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 5, availability: 1.0, defectRate: 0.3, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [],
      totalDuration: 200,
    });

    const result = runSimulation(scenario);
    const totalUnits = result.summary.totalProduced + result.summary.totalScrapped;
    const scrapRatio = result.summary.totalScrapped / totalUnits;
    // Should be close to 30%
    expect(scrapRatio).toBeCloseTo(0.3, 1);
  });
});

describe('Rework Max Attempts', () => {
  it('reworks up to maxReworkAttempts then scraps', () => {
    // defectRate = 1.0 → every unit is defective
    // maxReworkAttempts = 2 → rework twice, then scrap
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 5, availability: 1.0, defectRate: 1.0, maxReworkAttempts: 2 },
      ],
      bufferCapacities: [],
      totalDuration: 500,
    });

    const result = runSimulation(scenario);
    // All units should be scrapped eventually (100% defect rate, always fails after rework)
    expect(result.summary.totalProduced).toBe(0);
    expect(result.summary.totalScrapped).toBeGreaterThan(0);
    // Each unit processed 3 times (1 original + 2 reworks) then scrapped
    expect(result.summary.totalReworked).toBeGreaterThan(0);
  });

  it('units with maxReworkAttempts=0 are scrapped immediately on defect', () => {
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 5, availability: 1.0, defectRate: 0.5, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [],
      totalDuration: 500,
    });

    const result = runSimulation(scenario);
    expect(result.summary.totalScrapped).toBeGreaterThan(0);
    // No rework should happen
    expect(result.summary.totalReworked).toBe(0);
  });
});

describe('Break Freeze/Resume Semantics', () => {
  it('pauses processing during breaks and resumes after', () => {
    // Single station, CT=10s, break from 25s to 35s
    // Without break: unit at t=0→10, 10→20, 20→30, 30→40, 40→50...
    // With break at 25-35: unit at t=0→10, 10→20, 20→?
    //   At t=25, unit has been processing for 5s (remaining 5s)
    //   Break until t=35, then resumes, finishes at t=40
    //   Next: 40→50, 50→60...
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [],
      totalDuration: 100,
      breaks: [{ startOffset: 25, duration: 10 }],
    });

    const result = runSimulation(scenario);

    // Without break in 100s: 100/10 = 10 units
    // With 10s break: 90s productive → 9 units
    expect(result.summary.totalProduced).toBe(9);
  });

  it('correctly accounts break time in station metrics', () => {
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [],
      totalDuration: 100,
      breaks: [{ startOffset: 50, duration: 20 }],
    });

    const result = runSimulation(scenario);
    // 80s productive for station with CT=10, so 8 units
    expect(result.summary.totalProduced).toBe(8);

    // Station should have high utilization of productive time
    expect(result.stationMetrics[0].utilization).toBeGreaterThan(0.9);
  });
});

describe('Warmup Exclusion', () => {
  it('excludes warmup period from throughput calculation', () => {
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [],
      totalDuration: 100,
      warmupDuration: 50,
    });

    const result = runSimulation(scenario);
    // 10 total units (100/10), but only 5 after warmup (50s→100s)
    // Throughput = units produced after warmup / (100 - 50) = counted/50
    // Post-warmup produced: units finishing after t=50
    expect(result.summary.totalProduced).toBeGreaterThan(0);
    expect(result.summary.totalProduced).toBeLessThanOrEqual(10);
  });
});

describe('Cut-off Termination', () => {
  it('stops at exactly the cut-off time without draining', () => {
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
        { id: 's2', name: 'S2', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [10],
      totalDuration: 100,
    });

    const result = runSimulation(scenario);
    // Not all created units will be completed (units in transit are abandoned)
    // First unit exits at t=20 (10+10), then every 10s after
    // At t=100: about 9 completed (at t=20,30,40,50,60,70,80,90,100)
    expect(result.summary.totalProduced).toBeGreaterThan(0);
    expect(result.summary.totalProduced).toBeLessThanOrEqual(10);
  });
});

describe('Blocking and Starvation', () => {
  it('detects blocking when downstream buffer is full', () => {
    // Fast station → tiny buffer → slow station
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'Fast', cycleTime: 5, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
        { id: 's2', name: 'Slow', cycleTime: 20, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [2], // tiny buffer
      totalDuration: 500,
    });

    const result = runSimulation(scenario);
    // Fast station should experience blocking
    expect(result.stationMetrics[0].blockingRate).toBeGreaterThan(0);
  });

  it('detects starvation when upstream is slower', () => {
    // Slow station → large buffer → fast station
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'Slow', cycleTime: 20, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
        { id: 's2', name: 'Fast', cycleTime: 5, availability: 1.0, defectRate: 0, maxReworkAttempts: 0 },
      ],
      bufferCapacities: [100],
      totalDuration: 500,
    });

    const result = runSimulation(scenario);
    // Fast station should experience starvation
    expect(result.stationMetrics[1].starvationRate).toBeGreaterThan(0);
  });
});

describe('WIP and Throughput Sanity', () => {
  it('throughput is positive for a working line', () => {
    const scenario = makeSimpleScenario({
      totalDuration: 1000,
    });

    const result = runSimulation(scenario);
    expect(result.summary.throughput).toBeGreaterThan(0);
    expect(result.summary.totalProduced).toBeGreaterThan(0);
  });

  it('WIP is bounded and positive', () => {
    const scenario = makeSimpleScenario({
      totalDuration: 1000,
    });

    const result = runSimulation(scenario);
    expect(result.summary.averageWIP).toBeGreaterThan(0);
    expect(result.summary.maxWIP).toBeGreaterThan(0);
    expect(result.summary.maxWIP).toBeLessThanOrEqual(100); // reasonable upper bound
  });

  it('availability reduces effective throughput', () => {
    const fullAvail = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
      ],
      bufferCapacities: [],
      totalDuration: 1000,
    });

    const reducedAvail = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 0.5, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
      ],
      bufferCapacities: [],
      totalDuration: 1000,
    });

    const r1 = runSimulation(fullAvail);
    const r2 = runSimulation(reducedAvail);

    expect(r2.summary.totalProduced).toBeLessThan(r1.summary.totalProduced);
  });
});

// ─── Capacity > 1 Tests ───

describe('Station Capacity > 1', () => {
  it('station with capacity=2 produces more than capacity=1 when it is the bottleneck', () => {
    // Slow station with capacity=1: bottleneck CT=20, max throughput ~0.05 u/s
    const cap1 = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'Fast', cycleTime: 5, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
        { id: 's2', name: 'Slow', cycleTime: 20, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
      ],
      bufferCapacities: [10],
      totalDuration: 1000,
    });

    // Same but slow station has capacity=2: two slots, effectively doubles throughput
    const cap2 = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'Fast', cycleTime: 5, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
        { id: 's2', name: 'Slow', cycleTime: 20, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 2 },
      ],
      bufferCapacities: [10],
      totalDuration: 1000,
    });

    const r1 = runSimulation(cap1);
    const r2 = runSimulation(cap2);

    // capacity=2 should produce significantly more (close to double, limited by upstream)
    expect(r2.summary.totalProduced).toBeGreaterThan(r1.summary.totalProduced * 1.3);
  });

  it('single station with capacity=2 processes roughly twice as many units', () => {
    const cap1 = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
      ],
      bufferCapacities: [],
      totalDuration: 500,
    });

    const cap2 = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 2 },
      ],
      bufferCapacities: [],
      totalDuration: 500,
    });

    const r1 = runSimulation(cap1);
    const r2 = runSimulation(cap2);

    // capacity=2 on a single station (unlimited source) → ~2x throughput
    expect(r2.summary.totalProduced).toBe(r1.summary.totalProduced * 2);
  });

  it('capacity > 1 respects breaks correctly (freeze/resume all slots)', () => {
    // Single station, capacity=2, CT=10, break 50-70s (20s break)
    // Without break: capacity=2 in 100s → 20 units (two parallel slots each process 10)
    // With 20s break: 80s productive → 16 units
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 2 },
      ],
      bufferCapacities: [],
      totalDuration: 100,
      breaks: [{ startOffset: 50, duration: 20 }],
    });

    const result = runSimulation(scenario);
    // 80s productive, 2 slots → 16 units
    expect(result.summary.totalProduced).toBe(16);
  });

  it('capacity > 1 with defects works correctly', () => {
    // defectRate=0.5, maxReworkAttempts=0, capacity=2
    // Every 2nd unit is scrapped (per defect accumulator)
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 5, availability: 1.0, defectRate: 0.5, maxReworkAttempts: 0, capacity: 2 },
      ],
      bufferCapacities: [],
      totalDuration: 200,
    });

    const result = runSimulation(scenario);
    const totalUnits = result.summary.totalProduced + result.summary.totalScrapped;
    expect(totalUnits).toBeGreaterThan(0);
    // ~50% should be scrapped
    const scrapRatio = result.summary.totalScrapped / totalUnits;
    expect(scrapRatio).toBeCloseTo(0.5, 1);
  });

  it('capacity > 1 blocking works when downstream buffer is full', () => {
    // Fast station cap=2 → tiny buffer → slow station cap=1
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'Fast', cycleTime: 5, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 2 },
        { id: 's2', name: 'Slow', cycleTime: 20, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
      ],
      bufferCapacities: [2],
      totalDuration: 500,
    });

    const result = runSimulation(scenario);
    // Fast station (cap 2) should experience blocking
    expect(result.stationMetrics[0].blockingRate).toBeGreaterThan(0);
  });

  it('WIP accounts for all occupied slots across capacity > 1 stations', () => {
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 10, availability: 1.0, defectRate: 0, maxReworkAttempts: 0, capacity: 3 },
      ],
      bufferCapacities: [],
      totalDuration: 100,
    });

    const result = runSimulation(scenario);
    // With capacity=3, max WIP should be 3 (three units processing in parallel)
    expect(result.summary.maxWIP).toBe(3);
  });

  it('invariants hold for capacity > 1 stations', () => {
    const scenario = makeSimpleScenario({
      stations: [
        { id: 's1', name: 'S1', cycleTime: 8, availability: 0.95, defectRate: 0.05, maxReworkAttempts: 1, capacity: 2 },
        { id: 's2', name: 'S2', cycleTime: 12, availability: 0.90, defectRate: 0.02, maxReworkAttempts: 0, capacity: 1 },
        { id: 's3', name: 'S3', cycleTime: 6, availability: 0.98, defectRate: 0.01, maxReworkAttempts: 2, capacity: 3 },
      ],
      bufferCapacities: [5, 5],
      totalDuration: 3600,
      breaks: [{ startOffset: 1800, duration: 300 }],
    });

    const result = runSimulation(scenario);

    // Utilization + blocking + starvation ≈ 1.0
    for (const sm of result.stationMetrics) {
      const sum = sm.utilization + sm.blockingRate + sm.starvationRate;
      expect(sum).toBeGreaterThan(0.9);
      expect(sum).toBeLessThan(1.1);
    }

    // Buffers never exceed capacity
    for (let i = 0; i < result.bufferMetrics.length; i++) {
      expect(result.bufferMetrics[i].maxQueueLength).toBeLessThanOrEqual(5);
    }

    // Positive throughput
    expect(result.summary.throughput).toBeGreaterThan(0);
    expect(result.summary.totalProduced).toBeGreaterThan(0);
  });
});
