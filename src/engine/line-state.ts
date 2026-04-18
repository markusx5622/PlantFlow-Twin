// ─── PlantFlow Twin — Line State ───
// Manages internal mutable state for the simulation.

import {
  LineModel,
  InternalStationState,
  InternalBufferState,
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
    this.stations = model.stations.map(() => this.freshStationState());
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
      if (s.currentUnit !== null) wip++;
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

  // ─── Station State Transitions ───

  transitionStation(
    stationIndex: number,
    newStatus: StationStatus,
    time: number,
  ): void {
    const s = this.stations[stationIndex];
    const elapsed = time - s.stateEnteredAt;

    switch (s.status) {
      case StationStatus.PROCESSING:
        s.totalProcessingTime += elapsed;
        break;
      case StationStatus.BLOCKED:
        s.totalBlockedTime += elapsed;
        break;
      case StationStatus.IDLE:
        s.totalIdleTime += elapsed;
        break;
      case StationStatus.ON_BREAK:
        s.totalBreakTime += elapsed;
        break;
    }

    s.status = newStatus;
    s.stateEnteredAt = time;
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

  private freshStationState(): InternalStationState {
    return {
      status: StationStatus.IDLE,
      currentUnit: null,
      defectAccumulator: 0,
      remainingProcessingTime: 0,
      preBreakStatus: null,
      version: 0,
      stateEnteredAt: 0,
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
