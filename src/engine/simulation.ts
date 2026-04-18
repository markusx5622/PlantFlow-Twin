// ─── PlantFlow Twin — Deterministic DES Engine ───
// Unit-by-unit discrete event simulation for a linear sequential production line.
// Spec v1.1 compliant: deterministic defects, rework, blocking, starvation,
// breaks, warmup, cut-off termination (no drain), capacity > 1 parallelism.

import {
  Scenario,
  SimulationResult,
  LineModel,
  EventType,
  EVENT_PRIORITY,
  StationStatus,
  Unit,
} from './types';
import { EventQueue } from './event-queue';
import { LineState } from './line-state';
import { collectStats } from './stats';
import { detectBottleneck } from './bottleneck';
import { generateRecommendations, resetRecommendationIds } from './recommendations';

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
  scheduleEvent(queue, cutoff, EventType.SIMULATION_END, -1, -1, 0);

  // Schedule shift breaks (repeating for each shift)
  for (let shiftIdx = 0; shiftIdx < config.numberOfShifts; shiftIdx++) {
    for (const shift of model.shifts) {
      const shiftStart = shiftIdx * shift.duration;
      for (const brk of shift.breaks) {
        const breakStart = shiftStart + brk.startOffset;
        const breakEnd = breakStart + brk.duration;
        if (breakStart < cutoff) {
          scheduleEvent(queue, breakStart, EventType.BREAK_START, -1, -1, 0);
        }
        if (breakEnd < cutoff) {
          scheduleEvent(queue, breakEnd, EventType.BREAK_END, -1, -1, 0);
        }
      }
    }
  }

  // ── Activate all stations initially ──
  for (let i = 0; i < n; i++) {
    scheduleEvent(queue, 0, EventType.TRY_ACTIVATE, i, -1, state.stations[i].stationVersion);
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
        const slotIdx = event.slotIndex;
        if (idx < 0 || idx >= n) break;
        if (slotIdx < 0 || slotIdx >= state.stations[idx].slots.length) break;
        if (state.stations[idx].slots[slotIdx].version !== event.version) break; // stale
        if (onBreak) break;
        handleProcessEnd(state, queue, model, idx, slotIdx, currentTime);
        break;
      }

      case EventType.TRY_ACTIVATE: {
        const idx = event.stationIndex;
        if (idx < 0 || idx >= n) break;
        if (state.stations[idx].stationVersion !== event.version) break; // stale
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

/**
 * Try to activate all idle slots of a station.
 * For capacity=1, this behaves identically to the original single-slot logic.
 */
function tryActivateStation(
  state: LineState,
  queue: EventQueue,
  model: LineModel,
  stationIndex: number,
  time: number,
): void {
  const ss = state.stations[stationIndex];
  const station = model.stations[stationIndex];

  for (let slotIdx = 0; slotIdx < ss.slots.length; slotIdx++) {
    const slot = ss.slots[slotIdx];
    if (slot.status !== StationStatus.IDLE) continue;

    let unit: Unit | undefined;

    if (stationIndex === 0) {
      // Unlimited source: always create a new unit for the first station
      unit = state.createUnit(time);
    } else {
      // Pull from upstream buffer (buffers[stationIndex - 1])
      const bufIdx = stationIndex - 1;
      unit = state.dequeueBuffer(bufIdx, time);
      if (!unit) break; // no more units in upstream buffer — stop trying slots

      // After pulling, try to unblock the upstream station
      handleUnblock(state, queue, model, stationIndex - 1, time);
    }

    state.updateWip(time);

    // Start processing
    state.transitionSlot(stationIndex, slotIdx, StationStatus.PROCESSING, time);
    slot.unit = unit;

    const effectiveCT = station.cycleTime / station.availability;
    slot.remainingProcessingTime = effectiveCT;
    ss.sumProcessingDurations += effectiveCT;

    scheduleEvent(
      queue,
      time + effectiveCT,
      EventType.PROCESS_END,
      stationIndex,
      slotIdx,
      slot.version,
    );
  }
}

function handleProcessEnd(
  state: LineState,
  queue: EventQueue,
  model: LineModel,
  stationIndex: number,
  slotIndex: number,
  time: number,
): void {
  const ss = state.stations[stationIndex];
  const slot = ss.slots[slotIndex];
  const station = model.stations[stationIndex];
  const unit = slot.unit!;
  const n = model.stations.length;

  ss.totalProcessed++;

  // ── Defect check (deterministic accumulator, shared across slots) ──
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
      slot.unit = null;
      state.updateWip(time);

      // Try next unit on this slot
      state.transitionSlot(stationIndex, slotIndex, StationStatus.IDLE, time);
      scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, -1, ss.stationVersion);
      return;
    }

    // Rework: record attempt and process again on the same station slot
    unit.reworkAttempts.set(station.id, nextAttempt);
    ss.totalReworked++;
    const effectiveCT = station.cycleTime / station.availability;
    slot.remainingProcessingTime = effectiveCT;
    ss.sumProcessingDurations += effectiveCT;

    scheduleEvent(
      queue,
      time + effectiveCT,
      EventType.PROCESS_END,
      stationIndex,
      slotIndex,
      slot.version,
    );
    return;
  }

  // ── Move unit downstream ──
  if (stationIndex === n - 1) {
    // Last station → sink
    unit.completedAt = time;
    state.producedUnits.push(unit);
    slot.unit = null;
    state.updateWip(time);

    state.transitionSlot(stationIndex, slotIndex, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, -1, ss.stationVersion);
    return;
  }

  // Try to push to downstream buffer (buffers[stationIndex])
  const bufIdx = stationIndex;
  if (state.bufferHasSpace(bufIdx)) {
    state.enqueueBuffer(bufIdx, unit, time);
    slot.unit = null;
    state.updateWip(time);

    // Try to activate downstream station
    const downIdx = stationIndex + 1;
    const downSs = state.stations[downIdx];
    const hasIdleSlot = downSs.slots.some((s) => s.status === StationStatus.IDLE);
    if (hasIdleSlot) {
      scheduleEvent(
        queue,
        time,
        EventType.TRY_ACTIVATE,
        downIdx,
        -1,
        downSs.stationVersion,
      );
    }

    // Try next unit on this station
    state.transitionSlot(stationIndex, slotIndex, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, -1, ss.stationVersion);
  } else {
    // BLOCKED — unit stays in slot
    state.transitionSlot(stationIndex, slotIndex, StationStatus.BLOCKED, time);
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
  const n = model.stations.length;

  // Find first blocked slot
  const blockedSlotIdx = ss.slots.findIndex((s) => s.status === StationStatus.BLOCKED);
  if (blockedSlotIdx < 0) return;

  const slot = ss.slots[blockedSlotIdx];
  const unit = slot.unit!;

  if (stationIndex === n - 1) {
    // Edge case: last station was blocked (shouldn't normally happen)
    unit.completedAt = time;
    state.producedUnits.push(unit);
    slot.unit = null;
    state.updateWip(time);
    state.transitionSlot(stationIndex, blockedSlotIdx, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, -1, ss.stationVersion);
    return;
  }

  const bufIdx = stationIndex;
  if (state.bufferHasSpace(bufIdx)) {
    state.enqueueBuffer(bufIdx, unit, time);
    slot.unit = null;
    state.updateWip(time);

    // Activate downstream
    const downIdx = stationIndex + 1;
    const downSs = state.stations[downIdx];
    const hasIdleSlot = downSs.slots.some((s) => s.status === StationStatus.IDLE);
    if (hasIdleSlot) {
      scheduleEvent(
        queue,
        time,
        EventType.TRY_ACTIVATE,
        downIdx,
        -1,
        downSs.stationVersion,
      );
    }

    // This station slot can now take a new unit
    state.transitionSlot(stationIndex, blockedSlotIdx, StationStatus.IDLE, time);
    scheduleEvent(queue, time, EventType.TRY_ACTIVATE, stationIndex, -1, ss.stationVersion);
  }
  // else: still blocked — wait
}

// ── Break Handling ──

function handleBreakStart(
  state: LineState,
  _queue: EventQueue,
  _model: LineModel,
  n: number,
  time: number,
): void {
  for (let i = 0; i < n; i++) {
    const ss = state.stations[i];

    for (let slotIdx = 0; slotIdx < ss.slots.length; slotIdx++) {
      const slot = ss.slots[slotIdx];
      slot.preBreakStatus = slot.status;

      if (slot.status === StationStatus.PROCESSING) {
        // Compute remaining processing time
        const elapsedInProcessing = time - slot.stateEnteredAt;
        slot.remainingProcessingTime = Math.max(
          0,
          slot.remainingProcessingTime - elapsedInProcessing,
        );
        slot.version++; // Invalidate pending PROCESS_END for this slot
      }

      state.transitionSlot(i, slotIdx, StationStatus.ON_BREAK, time);
    }
  }
}

function handleBreakEnd(
  state: LineState,
  queue: EventQueue,
  _model: LineModel,
  n: number,
  time: number,
): void {
  for (let i = 0; i < n; i++) {
    const ss = state.stations[i];
    let needsTryActivate = false;

    for (let slotIdx = 0; slotIdx < ss.slots.length; slotIdx++) {
      const slot = ss.slots[slotIdx];
      const prevStatus = slot.preBreakStatus ?? StationStatus.IDLE;
      slot.preBreakStatus = null;

      if (prevStatus === StationStatus.PROCESSING && slot.unit !== null) {
        // Resume processing with remaining time
        state.transitionSlot(i, slotIdx, StationStatus.PROCESSING, time);
        scheduleEvent(
          queue,
          time + slot.remainingProcessingTime,
          EventType.PROCESS_END,
          i,
          slotIdx,
          slot.version,
        );
      } else if (prevStatus === StationStatus.BLOCKED && slot.unit !== null) {
        state.transitionSlot(i, slotIdx, StationStatus.BLOCKED, time);
        handleUnblock(state, queue, _model, i, time);
      } else {
        // Was IDLE — try to activate
        state.transitionSlot(i, slotIdx, StationStatus.IDLE, time);
        needsTryActivate = true;
      }
    }

    if (needsTryActivate) {
      scheduleEvent(queue, time, EventType.TRY_ACTIVATE, i, -1, ss.stationVersion);
    }
  }
}

// ── Helpers ──

function scheduleEvent(
  queue: EventQueue,
  time: number,
  type: EventType,
  stationIndex: number,
  slotIndex: number,
  version: number,
): void {
  queue.push({
    time,
    type,
    priority: EVENT_PRIORITY[type],
    stationIndex,
    slotIndex,
    version,
  });
}

function finalizeAll(state: LineState, n: number, time: number): void {
  for (let i = 0; i < n; i++) {
    const ss = state.stations[i];
    for (let slotIdx = 0; slotIdx < ss.slots.length; slotIdx++) {
      const slot = ss.slots[slotIdx];
      const elapsed = time - slot.stateEnteredAt;

      switch (slot.status) {
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
      slot.stateEnteredAt = time;
    }
  }
  state.updateWip(time);
}
