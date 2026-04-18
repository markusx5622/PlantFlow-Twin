// ─── PlantFlow Twin — Stats Collector ───
// Computes post-simulation metrics from LineState.
// For stations with capacity > 1, time metrics are normalized by capacity.

import {
  LineModel,
  SimulationConfig,
  SimulationSummary,
  StationMetrics,
  BufferMetrics,
} from './types.js';
import { LineState } from './line-state.js';

export function collectStats(
  state: LineState,
  model: LineModel,
  config: SimulationConfig,
): {
  summary: SimulationSummary;
  stationMetrics: StationMetrics[];
  bufferMetrics: BufferMetrics[];
} {
  const warmup = config.warmupDuration;
  const end = config.totalDuration;
  const postWarmupDuration = end - warmup;

  // ── Summary ──
  const produced = state.producedUnits.filter((u) => u.completedAt! >= warmup);
  const scrapped = state.scrappedUnits.filter((u) => u.completedAt! >= warmup);
  const totalProduced = produced.length;
  const totalScrapped = scrapped.length;

  let totalReworked = 0;
  for (const u of [...produced, ...scrapped]) {
    for (const [, attempts] of u.reworkAttempts) {
      totalReworked += attempts;
    }
  }

  const throughput = postWarmupDuration > 0 ? totalProduced / postWarmupDuration : 0;

  let sumLeadTime = 0;
  for (const u of produced) {
    sumLeadTime += u.completedAt! - u.createdAt;
  }
  const averageLeadTime = totalProduced > 0 ? sumLeadTime / totalProduced : 0;

  const averageWIP = state.getAverageWip(end, warmup);
  const maxWIP = state.maxWip;

  const summary: SimulationSummary = {
    throughput,
    averageLeadTime,
    totalProduced,
    totalScrapped,
    totalReworked,
    averageWIP,
    maxWIP,
  };

  // ── Station Metrics ──
  const stationMetrics: StationMetrics[] = model.stations.map((station, i) => {
    const s = state.stations[i];
    const capacity = station.capacity;

    // Finalize the current slot intervals to end time
    let procTime = s.totalProcessingTime;
    let blockTime = s.totalBlockedTime;
    let idleTime = s.totalIdleTime;
    let breakTime = s.totalBreakTime;

    for (const slot of s.slots) {
      const elapsed = end - slot.stateEnteredAt;
      switch (slot.status) {
        case 'PROCESSING':
          procTime += elapsed;
          break;
        case 'BLOCKED':
          blockTime += elapsed;
          break;
        case 'IDLE':
          idleTime += elapsed;
          break;
        case 'ON_BREAK':
          breakTime += elapsed;
          break;
      }
    }

    // Subtract warmup portion (approximate: proportional)
    if (warmup > 0 && end > 0) {
      const ratio = postWarmupDuration / end;
      procTime *= ratio;
      blockTime *= ratio;
      idleTime *= ratio;
      breakTime *= ratio;
    }

    // For capacity > 1, activeTime spans multiple slots
    const activeTime = procTime + blockTime + idleTime;
    const utilization = activeTime > 0 ? procTime / activeTime : 0;
    const blockingRate = activeTime > 0 ? blockTime / activeTime : 0;
    const starvationRate = activeTime > 0 ? idleTime / activeTime : 0;

    const effectiveCycleTime =
      s.totalProcessed > 0 ? s.sumProcessingDurations / s.totalProcessed : station.cycleTime / station.availability;

    return {
      stationId: station.id,
      utilization,
      blockingRate,
      starvationRate,
      effectiveCycleTime,
      totalProcessed: s.totalProcessed,
      totalScrapped: s.totalScrapped,
      totalReworked: s.totalReworked,
    };
  });

  // ── Buffer Metrics ──
  const bufferMetrics: BufferMetrics[] = model.buffers.map((buffer, i) => {
    const b = state.buffers[i];
    const totalTime = end > 0 ? end : 1;

    // Finalize the last segment
    const finalWeighted =
      b.weightedQueueSum + b.entries.length * (end - b.lastChangeTime);
    const averageQueueLength = finalWeighted / totalTime;
    const averageWaitTime = b.totalDequeued > 0 ? b.totalWaitTime / b.totalDequeued : 0;

    return {
      bufferId: buffer.id,
      averageQueueLength,
      maxQueueLength: b.maxQueueLength,
      averageWaitTime,
    };
  });

  return { summary, stationMetrics, bufferMetrics };
}
