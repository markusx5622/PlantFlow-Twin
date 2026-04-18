// ─── PlantFlow Twin — Deterministic DES Engine ───
// Unit-by-unit discrete event simulation for a linear sequential production line.
// Spec v1.1 compliant: deterministic defects, rework, blocking, starvation,
// breaks, warmup, cut-off termination (no drain).

import {
  Scenario,
  SimulationResult,
  LineModel,
  EventType,
  EVENT_PRIORITY,
  StationStatus,
  Unit,
} from './types.js';
import { EventQueue } from './event-queue.js';
import { LineState } from './line-state.js';
import { collectStats } from './stats.js';
import { detectBottleneck } from './bottleneck.js';
import { generateRecommendations, resetRecommendationIds } from './recommendations.js';

// ─── Public API ───

export function runSimulation(scenario: Scenario): SimulationResult {
  resetRecommendationIds();
  const t0 = performance.now();
  const { lineModel: model, config } = scenario;
  const n = model.stations.length;
  const queue = new EventQueue();
  const state = new LineState(model);

  const cutoff = config.totalDuration;

  // ── Schedule global events ──
  scheduleEvent(queue, cutoff, EventType.SIMULATION_END, -1, 0);

  // Schedule shift breaks (repeating for each shift)
  for (let shiftIdx = 0; shiftIdx < config.numberOfShifts; shiftIdx++) {
    for (const shift of model.shifts) {
      const shiftStart = shiftIdx * shift.duration;
      for (const brk of shift.breaks) {
        const breakStart = shiftStart + brk.startOffset;
        const breakEnd = breakStart + brk.duration;
        if (breakStart < cutoff) {
          scheduleEvent(queue, breakStart, EventType.BREAK_START, -1, 0);
        }
        if (breakEnd < cutoff) {
          scheduleEvent(queue, breakEnd, EventType.BREAK_END, -1, 0);
        }
      }
    }
  }

  // ── Activate all stations initially ──
  for (let i = 0; i < n; i++) {
    scheduleEvent(queue, 0, EventType.TRY_ACTIVATE, i, state.stations[i].version);
  }

  // ── Main loop ──
  let onBreak = false;

  while (!queue.isEmpty()) {
    const event = queue.pop()!;
    if (event.time > cutoff) break;

    const currentTime = event.time;

    switch (event.type) {
      case EventType.SIMULATION_END:
        finalizeAll(state, n, currentTime);
        break;

      case EventType.BREAK_START:
        onBreak = true;
        handleBreakStart(state, queue, model, n, currentTime);
        break;

      case EventType.BREAK_END:
        onBreak = false;
        handleBreakEnd(state, queue, model, n, currentTime);
        break;

      case EventType.PROCESS_END: {
        const idx = event.stationIndex;
        if (idx < 0 || idx >= n) break;
        if (state.stations[idx].version !== event.version) break; // stale
        if (onBreak) break;
        handleProcessEnd(state, queue, model, idx, currentTime);
        break;
      }

      case EventType.TRY_ACTIVATE: {
        const idx = event.stationIndex;
        if (idx < 0 || idx >= n) break;
        if (state.stations[idx].version !== event.version) break; // stale
        if (onBreak) break;
        tryActivateStation(state, queue, model, idx, currentTime);
        break;
      }
    }
  }

  // Ensure final state times are captured
  finalizeAll(state, n, cutoff);

  // ── Collect results ──
  const { summary, stationMetrics, bufferMetrics } = collectStats(state, model, config);
  const bottleneck = detectBottleneck(stationMetrics, bufferMetrics, model);
  const recommendations = generateRecommendations(
    stationMetrics,
    bufferMetrics,
    bottleneck,
    model,
  );

  return {
    scenarioId: scenario.id,
    summary,
    stationMetrics,
    bufferMetrics,
    bottleneck,
    recommendations,
    simulationTimeMs: performance.now() - t0,
  };
}

// ─── Event Handlers ───

function tryActivateStation(
  state: LineState,
  queue: EventQueue,
  model: LineModel,
  stationIndex: number,
  time: number,
): void {
  const ss = state.stations[stationIndex];
  if (ss.status !== StationStatus.IDLE) return;

  let unit: Unit | undefined;

  if (stationIndex === 0) {
    // Unlimited source: always create a new unit for the first station
    unit = state.createUnit(time);
  } else {
    // Pull from upstream buffer (buffers[stationIndex - 1])
    const bufIdx = stationIndex - 1;
    unit = state.dequeueBuffer(bufIdx, time);
    if (!unit) return; // starvation — remain IDLE

    // After pulling, try to unblock the upstream station
    handleUnblock(state, queue, model, stationIndex - 1, time);
  }

  state.updateWip(time);

  // Start processing
  state.transitionStation(stationIndex, StationStatus.PROCESSING, time);
  ss.currentUnit = unit;

  const station = model.stations[stationIndex];
  const effectiveCT = station.cycleTime / station.availability;
  ss.remainingProcessingTime = effectiveCT;
  ss.sumProcessingDurations += effectiveCT;

  scheduleEvent(
    queue,
    time + effectiveCT,
    EventType.PROCESS_END,
    stationIndex,
    ss.version,
  );
}

function handleProcessEnd(
  state: LineState,
  queue: EventQueue,
  model: LineModel,
  stationIndex: number,
  time: number,
): void {
  const ss = state.stations[stationIndex];
  const station = model.stations[stationIndex];
  const unit = ss.currentUnit!;
  const n = model.stations.length;

  ss.totalProcessed++;

  // ── Defect check (deterministic accumulator) ──
  ss.defectAccumulator += station.defectRate;
  if (ss.defectAccumulator >= 1.0) {
    ss.defectAccumulator -= 1.0;

    const previousAttempts = unit.reworkAttempts.get(station.id) ?? 0;
    const nextAttempt = previousAttempts + 1;

    if (nextAttempt > station.maxReworkAttempts) {
      // Forced scrap — no rework processing occurs
      ss.totalScrapped++;
      unit.completedAt = time;
      state.scrappedUnits.push(unit);
      ss.currentUnit = null;
      state.updateWip(time);

      // Try next unit
      state.transitionStation(stationIndex, StationStatus.IDLE, time);
      scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, ss.version);
      return;
    }

    // Rework: record attempt and process again on the same station
    unit.reworkAttempts.set(station.id, nextAttempt);
    ss.totalReworked++;
    const effectiveCT = station.cycleTime / station.availability;
    ss.remainingProcessingTime = effectiveCT;
    ss.sumProcessingDurations += effectiveCT;

    scheduleEvent(
      queue,
      time + effectiveCT,
      EventType.PROCESS_END,
      stationIndex,
      ss.version,
    );
    return;
  }

  // ── Move unit downstream ──
  if (stationIndex === n - 1) {
    // Last station → sink
    unit.completedAt = time;
    state.producedUnits.push(unit);
    ss.currentUnit = null;
    state.updateWip(time);

    state.transitionStation(stationIndex, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, ss.version);
    return;
  }

  // Try to push to downstream buffer (buffers[stationIndex])
  const bufIdx = stationIndex;
  if (state.bufferHasSpace(bufIdx)) {
    state.enqueueBuffer(bufIdx, unit, time);
    ss.currentUnit = null;
    state.updateWip(time);

    // Try to activate downstream station
    const downIdx = stationIndex + 1;
    if (state.stations[downIdx].status === StationStatus.IDLE) {
      scheduleEvent(
        queue,
        time,
        EventType.TRY_ACTIVATE,
        downIdx,
        state.stations[downIdx].version,
      );
    }

    // Try next unit on this station
    state.transitionStation(stationIndex, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, ss.version);
  } else {
    // BLOCKED — unit stays in station
    state.transitionStation(stationIndex, StationStatus.BLOCKED, time);
  }
}

function handleUnblock(
  state: LineState,
  queue: EventQueue,
  model: LineModel,
  stationIndex: number,
  time: number,
): void {
  const ss = state.stations[stationIndex];
  if (ss.status !== StationStatus.BLOCKED) return;

  const unit = ss.currentUnit!;
  const n = model.stations.length;

  if (stationIndex === n - 1) {
    // Edge case: last station was blocked (shouldn't normally happen)
    unit.completedAt = time;
    state.producedUnits.push(unit);
    ss.currentUnit = null;
    state.updateWip(time);
    state.transitionStation(stationIndex, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, ss.version);
    return;
  }

  const bufIdx = stationIndex;
  if (state.bufferHasSpace(bufIdx)) {
    state.enqueueBuffer(bufIdx, unit, time);
    ss.currentUnit = null;
    state.updateWip(time);

    // Activate downstream
    const downIdx = stationIndex + 1;
    if (state.stations[downIdx].status === StationStatus.IDLE) {
      scheduleEvent(
        queue,
        time,
        EventType.TRY_ACTIVATE,
        downIdx,
        state.stations[downIdx].version,
      );
    }

    // This station can now take a new unit
    state.transitionStation(stationIndex, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, ss.version);
  }
  // else: still blocked — wait
}

// ── Break Handling ──

function handleBreakStart(
  state: LineState,
  _queue: EventQueue,
  model: LineModel,
  n: number,
  time: number,
): void {
  for (let i = 0; i < n; i++) {
    const ss = state.stations[i];
    ss.preBreakStatus = ss.status;

    if (ss.status === StationStatus.PROCESSING) {
      // Compute remaining processing time
      const elapsedInProcessing = time - ss.stateEnteredAt;
      ss.remainingProcessingTime = Math.max(
        0,
        ss.remainingProcessingTime - elapsedInProcessing,
      );
      ss.version++; // Invalidate pending PROCESS_END
    }

    state.transitionStation(i, StationStatus.ON_BREAK, time);
  }
}

function handleBreakEnd(
  state: LineState,
  queue: EventQueue,
  model: LineModel,
  n: number,
  time: number,
): void {
  for (let i = 0; i < n; i++) {
    const ss = state.stations[i];
    const prevStatus = ss.preBreakStatus ?? StationStatus.IDLE;
    ss.preBreakStatus = null;

    if (prevStatus === StationStatus.PROCESSING && ss.currentUnit !== null) {
      // Resume processing with remaining time
      state.transitionStation(i, StationStatus.PROCESSING, time);
      scheduleEvent(
        queue,
        time + ss.remainingProcessingTime,
        EventType.PROCESS_END,
        i,
        ss.version,
      );
    } else if (prevStatus === StationStatus.BLOCKED && ss.currentUnit !== null) {
      state.transitionStation(i, StationStatus.BLOCKED, time);
      handleUnblock(state, queue, model, i, time);
    } else {
      // Was IDLE — try to activate
      state.transitionStation(i, StationStatus.IDLE, time);
      scheduleEvent(queue, time, EventType.TRY_ACTIVATE, i, ss.version);
    }
  }
}

// ── Helpers ──

function scheduleEvent(
  queue: EventQueue,
  time: number,
  type: EventType,
  stationIndex: number,
  version: number,
): void {
  queue.push({
    time,
    type,
    priority: EVENT_PRIORITY[type],
    stationIndex,
    version,
  });
}

function finalizeAll(state: LineState, n: number, time: number): void {
  for (let i = 0; i < n; i++) {
    const ss = state.stations[i];
    const elapsed = time - ss.stateEnteredAt;

    switch (ss.status) {
      case StationStatus.PROCESSING:
        ss.totalProcessingTime += elapsed;
        break;
      case StationStatus.BLOCKED:
        ss.totalBlockedTime += elapsed;
        break;
      case StationStatus.IDLE:
        ss.totalIdleTime += elapsed;
        break;
      case StationStatus.ON_BREAK:
        ss.totalBreakTime += elapsed;
        break;
    }
    ss.stateEnteredAt = time;
  }
  state.updateWip(time);
}
