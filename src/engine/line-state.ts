// ─── PlantFlow Twin — Line State ───
// Manages internal mutable state for the simulation.

import {
  LineModel,
  InternalStationState,
  InternalBufferState,
  StationSlot,
  StationStatus,
  Unit,
} from './types.js';

export class LineState {
  readonly stations: InternalStationState[];
  readonly buffers: InternalBufferState[];
  readonly producedUnits: Unit[] = [];
  readonly scrappedUnits: Unit[] = [];

  private unitCounter = 0;

  /** Time-weighted WIP tracking */
  private wipWeightedSum = 0;
  private lastWipChangeTime = 0;
  private currentWip = 0;
  maxWip = 0;

  constructor(private readonly model: LineModel) {
    this.stations = model.stations.map((s) => this.freshStationState(s.capacity));
    this.buffers = model.buffers.map(() => this.freshBufferState());
  }

  // ─── Unit Factory ───

  createUnit(time: number): Unit {
    return {
      id: `u-${++this.unitCounter}`,
      createdAt: time,
      reworkAttempts: new Map(),
    };
  }

  // ─── WIP Tracking ───

  /** Must be called whenever a unit enters or leaves the system */
  updateWip(time: number): void {
    const wip = this.computeCurrentWip();
    this.wipWeightedSum += this.currentWip * (time - this.lastWipChangeTime);
    this.lastWipChangeTime = time;
    this.currentWip = wip;
    if (wip > this.maxWip) this.maxWip = wip;
  }

  computeCurrentWip(): number {
    let wip = 0;
    for (const s of this.stations) {
      for (const slot of s.slots) {
        if (slot.unit !== null) wip++;
      }
    }
    for (const b of this.buffers) {
      wip += b.entries.length;
    }
    return wip;
  }

  getAverageWip(endTime: number, startTime: number): number {
    const duration = endTime - startTime;
    if (duration <= 0) return 0;
    // Finalize the current segment
    const finalSum =
      this.wipWeightedSum + this.currentWip * (endTime - this.lastWipChangeTime);
    return finalSum / duration;
  }

  // ─── Slot State Transitions ───

  /**
   * Transition a specific slot within a station to a new status.
   * Accumulates time spent in the previous status into the station aggregates.
   */
  transitionSlot(
    stationIndex: number,
    slotIndex: number,
    newStatus: StationStatus,
    time: number,
  ): void {
    const ss = this.stations[stationIndex];
    const slot = ss.slots[slotIndex];
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

    slot.status = newStatus;
    slot.stateEnteredAt = time;
  }

  // ─── Buffer Operations ───

  bufferHasSpace(bufferIndex: number): boolean {
    const buf = this.buffers[bufferIndex];
    const cap = this.model.buffers[bufferIndex].capacity;
    return buf.entries.length < cap;
  }

  bufferIsEmpty(bufferIndex: number): boolean {
    return this.buffers[bufferIndex].entries.length === 0;
  }

  enqueueBuffer(bufferIndex: number, unit: Unit, time: number): void {
    const buf = this.buffers[bufferIndex];
    buf.weightedQueueSum += buf.entries.length * (time - buf.lastChangeTime);
    buf.lastChangeTime = time;

    buf.entries.push({ unit, enqueuedAt: time });
    if (buf.entries.length > buf.maxQueueLength) {
      buf.maxQueueLength = buf.entries.length;
    }
  }

  dequeueBuffer(bufferIndex: number, time: number): Unit | undefined {
    const buf = this.buffers[bufferIndex];
    if (buf.entries.length === 0) return undefined;

    buf.weightedQueueSum += buf.entries.length * (time - buf.lastChangeTime);
    buf.lastChangeTime = time;

    const entry = buf.entries.shift()!;
    buf.totalWaitTime += time - entry.enqueuedAt;
    buf.totalDequeued++;
    return entry.unit;
  }

  bufferQueueLength(bufferIndex: number): number {
    return this.buffers[bufferIndex].entries.length;
  }

  // ─── Helpers ───

  private freshSlot(): StationSlot {
    return {
      unit: null,
      remainingProcessingTime: 0,
      version: 0,
      status: StationStatus.IDLE,
      stateEnteredAt: 0,
      preBreakStatus: null,
    };
  }

  private freshStationState(capacity: number): InternalStationState {
    const slots: StationSlot[] = [];
    for (let i = 0; i < capacity; i++) {
      slots.push(this.freshSlot());
    }
    return {
      slots,
      defectAccumulator: 0,
      stationVersion: 0,
      totalProcessingTime: 0,
      totalBlockedTime: 0,
      totalIdleTime: 0,
      totalBreakTime: 0,
      totalProcessed: 0,
      totalScrapped: 0,
      totalReworked: 0,
      sumProcessingDurations: 0,
    };
  }

  private freshBufferState(): InternalBufferState {
    return {
      entries: [],
      weightedQueueSum: 0,
      lastChangeTime: 0,
      maxQueueLength: 0,
      totalWaitTime: 0,
      totalDequeued: 0,
    };
  }
}
