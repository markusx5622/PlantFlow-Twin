// ─── Bottleneck Detection Tests ───
import { describe, it, expect } from 'vitest';
import { detectBottleneck } from '../../src/engine/bottleneck.js';
import { StationMetrics, BufferMetrics, LineModel } from '../../src/engine/types.js';

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
    totalScrapped: 0,
    totalReworked: 0,
  };
}

function makeBufferMetrics(id: string, avgQueue: number): BufferMetrics {
  return {
    bufferId: id,
    averageQueueLength: avgQueue,
    maxQueueLength: Math.ceil(avgQueue * 2),
    averageWaitTime: avgQueue * 10,
  };
}

const mockModel: LineModel = {
  id: 'test',
  name: 'Test',
  stations: [
    { id: 's1', name: 'Station 1', cycleTime: 10, availability: 1, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
    { id: 's2', name: 'Station 2', cycleTime: 10, availability: 1, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
    { id: 's3', name: 'Station 3', cycleTime: 10, availability: 1, defectRate: 0, maxReworkAttempts: 0, capacity: 1 },
  ],
  buffers: [
    { id: 'b1', name: 'B1', capacity: 10 },
    { id: 'b2', name: 'B2', capacity: 10 },
  ],
  shifts: [],
};

describe('Bottleneck Detection', () => {
  it('identifies the station with highest utilization as bottleneck', () => {
    const stationMetrics: StationMetrics[] = [
      makeMetrics('s1', 0.6, 0.3, 0.1),
      makeMetrics('s2', 0.95, 0.02, 0.03),
      makeMetrics('s3', 0.4, 0.1, 0.5),
    ];
    const bufferMetrics: BufferMetrics[] = [
      makeBufferMetrics('b1', 5),
      makeBufferMetrics('b2', 1),
    ];

    const result = detectBottleneck(stationMetrics, bufferMetrics, mockModel);
    expect(result.stationId).toBe('s2');
    expect(result.score).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.method).toBe('composite-v1');
  });

  it('returns allScores for every station', () => {
    const stationMetrics: StationMetrics[] = [
      makeMetrics('s1', 0.8, 0.1, 0.1),
      makeMetrics('s2', 0.9, 0.05, 0.05),
      makeMetrics('s3', 0.7, 0.15, 0.15),
    ];
    const bufferMetrics: BufferMetrics[] = [
      makeBufferMetrics('b1', 3),
      makeBufferMetrics('b2', 2),
    ];

    const result = detectBottleneck(stationMetrics, bufferMetrics, mockModel);
    expect(result.allScores).toHaveLength(3);
    expect(result.allScores.map((s) => s.stationId)).toEqual(['s1', 's2', 's3']);
  });

  it('handles single station', () => {
    const model: LineModel = {
      ...mockModel,
      stations: [mockModel.stations[0]],
      buffers: [],
    };
    const result = detectBottleneck(
      [makeMetrics('s1', 0.9, 0.05, 0.05)],
      [],
      model,
    );
    expect(result.stationId).toBe('s1');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('provides an explanation', () => {
    const stationMetrics: StationMetrics[] = [
      makeMetrics('s1', 0.95, 0.02, 0.03),
      makeMetrics('s2', 0.5, 0.1, 0.4),
    ];
    const result = detectBottleneck(
      stationMetrics,
      [makeBufferMetrics('b1', 5)],
      { ...mockModel, stations: mockModel.stations.slice(0, 2), buffers: mockModel.buffers.slice(0, 1) },
    );
    expect(result.explanation).toContain('Station');
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});

// ─── Spec v1.1 — Bottleneck Weights Validation ───
describe('Spec v1.1 — Bottleneck Composite Weights', () => {
  it('uses spec v1.1 weights: util=0.35, queue=0.25, starve=0.20, block=0.20', () => {
    // Create a scenario where we can verify the exact formula:
    // score = 0.35·utilNorm + 0.25·queueNorm + 0.20·downstreamStarvation + 0.20·inverseBlocking
    //
    // For station s1 (first station, no upstream buffer):
    //   utilNorm = 1.0/1.0 = 1.0
    //   queueNorm = 0 (no upstream buffer for first station)
    //   downstreamStarvation = avg starvation of s2 = 0.5
    //   inverseBlocking = 1 - 0.0 = 1.0
    //   score = 0.35*1.0 + 0.25*0.0 + 0.20*0.5 + 0.20*1.0 = 0.35 + 0 + 0.10 + 0.20 = 0.65

    const twoStationModel: LineModel = {
      ...mockModel,
      stations: mockModel.stations.slice(0, 2),
      buffers: mockModel.buffers.slice(0, 1),
    };

    const stationMetrics: StationMetrics[] = [
      makeMetrics('s1', 1.0, 0.0, 0.0),  // s1: full utilization, no blocking, no starvation
      makeMetrics('s2', 0.5, 0.0, 0.5),   // s2: 50% util, 0 blocking, 50% starvation
    ];
    const bufferMetrics: BufferMetrics[] = [
      makeBufferMetrics('b1', 3.0),
    ];

    const result = detectBottleneck(stationMetrics, bufferMetrics, twoStationModel);

    // Verify s1 score using exact spec weights
    const s1Score = result.allScores.find((s) => s.stationId === 's1')!;
    // utilNorm = 1.0/1.0 = 1.0, queueNorm = 0 (first station), downstreamStarv = 0.5, invBlock = 1.0
    const expectedS1 = 0.35 * 1.0 + 0.25 * 0.0 + 0.20 * 0.5 + 0.20 * 1.0;
    expect(s1Score.score).toBeCloseTo(expectedS1, 3);

    // Verify s2 score
    const s2Score = result.allScores.find((s) => s.stationId === 's2')!;
    // utilNorm = 0.5/1.0 = 0.5, queueNorm = 3.0/3.0 = 1.0, downstreamStarv = 0 (last station), invBlock = 1.0
    const expectedS2 = 0.35 * 0.5 + 0.25 * 1.0 + 0.20 * 0.0 + 0.20 * 1.0;
    expect(s2Score.score).toBeCloseTo(expectedS2, 3);
  });

  it('method is composite-v1', () => {
    const result = detectBottleneck(
      [makeMetrics('s1', 0.9, 0.05, 0.05)],
      [],
      { ...mockModel, stations: [mockModel.stations[0]], buffers: [] },
    );
    expect(result.method).toBe('composite-v1');
  });
});
