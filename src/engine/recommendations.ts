// ─── PlantFlow Twin — Recommendation Engine (Rule-based Phase 1) ───
// Generates candidate recommendations from simulation results.
// Does NOT re-simulate yet (that's for the next block).

import {
  Recommendation,
  ScenarioChange,
  RecommendationEffort,
  StationMetrics,
  BufferMetrics,
  BottleneckResult,
  LineModel,
  EntityId,
} from './types';

let recCounter = 0;
function nextRecId(): string {
  return `rec-${++recCounter}`;
}

/** Reset the ID counter (useful for deterministic tests). */
export function resetRecommendationIds(): void {
  recCounter = 0;
}

export function generateRecommendations(
  stationMetrics: StationMetrics[],
  bufferMetrics: BufferMetrics[],
  bottleneck: BottleneckResult,
  model: LineModel,
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (!bottleneck.stationId) return recs;

  const bnIdx = model.stations.findIndex((s) => s.id === bottleneck.stationId);
  if (bnIdx < 0) return recs;

  const bnStation = model.stations[bnIdx];
  const bnMetrics = stationMetrics[bnIdx];

  // Rule 1: Reduce cycle time on bottleneck
  if (bnMetrics.utilization > 0.7) {
    const newCT = round2(bnStation.cycleTime * 0.85);
    recs.push(
      makeRec({
        type: 'REDUCE_CYCLE_TIME',
        targetId: bnStation.id,
        change: {
          type: 'MODIFY_STATION',
          targetId: bnStation.id,
          field: 'cycleTime',
          oldValue: bnStation.cycleTime,
          newValue: newCT,
        },
        priority: 1,
        effort: 'HIGH',
        rationale: `Bottleneck station "${bnStation.name}" has ${(bnMetrics.utilization * 100).toFixed(1)}% utilization. Reducing cycle time from ${bnStation.cycleTime}s to ${newCT}s would increase throughput.`,
        expectedImprovement: `~${((1 - newCT / bnStation.cycleTime) * 100).toFixed(0)}% throughput increase potential`,
      }),
    );
  }

  // Rule 2: Improve availability on bottleneck
  if (bnStation.availability < 0.98) {
    const newAvail = Math.min(round2(bnStation.availability + 0.05), 1.0);
    recs.push(
      makeRec({
        type: 'IMPROVE_AVAILABILITY',
        targetId: bnStation.id,
        change: {
          type: 'MODIFY_STATION',
          targetId: bnStation.id,
          field: 'availability',
          oldValue: bnStation.availability,
          newValue: newAvail,
        },
        priority: 2,
        effort: 'MEDIUM',
        rationale: `Availability of "${bnStation.name}" is ${(bnStation.availability * 100).toFixed(1)}%. Improving to ${(newAvail * 100).toFixed(1)}% reduces effective cycle time.`,
        expectedImprovement: `~${(((newAvail - bnStation.availability) / bnStation.availability) * 100).toFixed(1)}% effective CT reduction`,
      }),
    );
  }

  // Rule 3: Increase upstream buffer if bottleneck has high starvation
  if (bnIdx > 0 && bnMetrics.starvationRate > 0.05) {
    const bufIdx = bnIdx - 1;
    const buf = model.buffers[bufIdx];
    if (isFinite(buf.capacity)) {
      const newCap = Math.ceil(buf.capacity * 1.5);
      recs.push(
        makeRec({
          type: 'INCREASE_BUFFER',
          targetId: buf.id,
          change: {
            type: 'MODIFY_BUFFER',
            targetId: buf.id,
            field: 'capacity',
            oldValue: buf.capacity,
            newValue: newCap,
          },
          priority: 3,
          effort: 'LOW',
          rationale: `Upstream buffer "${buf.name}" may starve the bottleneck. Increasing from ${buf.capacity} to ${newCap} units.`,
          expectedImprovement: 'Reduced starvation at bottleneck station',
        }),
      );
    }
  }

  // Rule 4: Increase downstream buffer if bottleneck has high blocking
  if (bnMetrics.blockingRate > 0.05 && bnIdx < model.buffers.length) {
    const bufIdx = bnIdx;
    const buf = model.buffers[bufIdx];
    if (isFinite(buf.capacity)) {
      const newCap = Math.ceil(buf.capacity * 1.5);
      recs.push(
        makeRec({
          type: 'INCREASE_BUFFER',
          targetId: buf.id,
          change: {
            type: 'MODIFY_BUFFER',
            targetId: buf.id,
            field: 'capacity',
            oldValue: buf.capacity,
            newValue: newCap,
          },
          priority: 3,
          effort: 'LOW',
          rationale: `Downstream buffer "${buf.name}" is causing blocking at bottleneck. Increasing from ${buf.capacity} to ${newCap} units.`,
          expectedImprovement: 'Reduced blocking at bottleneck station',
        }),
      );
    }
  }

  // Rule 5: Reduce defect rate if station has notable scrap/rework
  if (bnStation.defectRate > 0.01) {
    const newRate = round4(bnStation.defectRate * 0.5);
    recs.push(
      makeRec({
        type: 'REDUCE_DEFECTS',
        targetId: bnStation.id,
        change: {
          type: 'MODIFY_STATION',
          targetId: bnStation.id,
          field: 'defectRate',
          oldValue: bnStation.defectRate,
          newValue: newRate,
        },
        priority: 4,
        effort: 'MEDIUM',
        rationale: `Station "${bnStation.name}" has a ${(bnStation.defectRate * 100).toFixed(1)}% defect rate. Halving it reduces rework and scrap.`,
        expectedImprovement: 'Fewer rework cycles and scrapped units',
      }),
    );
  }

  return recs;
}

// ─── Helpers ───

interface RecInput {
  type: string;
  targetId: EntityId;
  change: ScenarioChange;
  priority: number;
  effort: RecommendationEffort;
  rationale: string;
  expectedImprovement: string;
}

function makeRec(input: RecInput): Recommendation {
  return {
    id: nextRecId(),
    ...input,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
