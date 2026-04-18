// ─── PlantFlow Twin — Domain & Internal Types ───
// Spec v1.1 compliant types for the deterministic DES engine.

// ─── Primitives ───

/** Unique identifier for any domain entity */
export type EntityId = string;

// ─── Public Domain Types ───

export interface Station {
  id: EntityId;
  name: string;
  /** Processing time per unit in seconds */
  cycleTime: number;
  /** Fraction 0–1 representing uptime ratio */
  availability: number;
  /** Deterministic defect rate, 0–1 */
  defectRate: number;
  /** Max rework attempts before forced scrap; 0 = scrap on first defect */
  maxReworkAttempts: number;
  /** Number of parallel processing slots; defaults to 1 */
  capacity: number;
}

export interface Buffer {
  id: EntityId;
  name: string;
  /** Max units; Infinity for unlimited */
  capacity: number;
}

export interface ShiftBreak {
  /** Seconds from shift start */
  startOffset: number;
  /** Duration in seconds */
  duration: number;
}

export interface Shift {
  id: EntityId;
  name: string;
  /** Total shift duration in seconds */
  duration: number;
  breaks: ShiftBreak[];
}

export interface LineModel {
  id: EntityId;
  name: string;
  /** Ordered left-to-right; Station[0] is first in the line */
  stations: Station[];
  /**
   * buffers[i] sits between stations[i] and stations[i+1].
   * Length must be stations.length - 1.
   */
  buffers: Buffer[];
  shifts: Shift[];
}

export interface SimulationConfig {
  /** Total simulation time in seconds */
  totalDuration: number;
  /** Warmup period in seconds — stats excluded */
  warmupDuration: number;
  /** Number of shifts to simulate (repeating) */
  numberOfShifts: number;
}

export interface Scenario {
  id: EntityId;
  name: string;
  description: string;
  lineModel: LineModel;
  config: SimulationConfig;
}

// ─── Result Types ───

export interface SimulationSummary {
  /** Units per second (post-warmup) */
  throughput: number;
  /** Average time from creation to completion (seconds) */
  averageLeadTime: number;
  totalProduced: number;
  totalScrapped: number;
  totalReworked: number;
  averageWIP: number;
  maxWIP: number;
}

export interface StationMetrics {
  stationId: EntityId;
  /** Fraction of active time spent processing */
  utilization: number;
  /** Fraction of active time spent blocked */
  blockingRate: number;
  /** Fraction of active time spent starving (idle) */
  starvationRate: number;
  /** Observed effective cycle time in seconds */
  effectiveCycleTime: number;
  totalProcessed: number;
  totalScrapped: number;
  totalReworked: number;
}

export interface BufferMetrics {
  bufferId: EntityId;
  averageQueueLength: number;
  maxQueueLength: number;
  averageWaitTime: number;
}

export interface BottleneckScore {
  stationId: EntityId;
  score: number;
}

export interface BottleneckResult {
  stationId: EntityId;
  score: number;
  /** 0–1 confidence that this is truly the bottleneck */
  confidence: number;
  method: string;
  allScores: BottleneckScore[];
  explanation: string;
}

export type RecommendationEffort = 'LOW' | 'MEDIUM' | 'HIGH';

export type ScenarioChangeType =
  | 'MODIFY_STATION'
  | 'MODIFY_BUFFER'
  | 'ADD_STATION'
  | 'REMOVE_STATION';

export interface ScenarioChange {
  type: ScenarioChangeType;
  targetId: EntityId;
  field: string;
  oldValue: number | string;
  newValue: number | string;
}

export interface Recommendation {
  id: EntityId;
  type: string;
  targetId: EntityId;
  change: ScenarioChange;
  priority: number;
  effort: RecommendationEffort;
  rationale: string;
  expectedImprovement: string;
}

export interface SimulationResult {
  scenarioId: EntityId;
  summary: SimulationSummary;
  stationMetrics: StationMetrics[];
  bufferMetrics: BufferMetrics[];
  bottleneck: BottleneckResult;
  recommendations: Recommendation[];
  /** Wall-clock time to run the simulation in ms */
  simulationTimeMs: number;
}

// ─── Internal Engine Types ───

export enum EventType {
  SIMULATION_END = 'SIMULATION_END',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  PROCESS_END = 'PROCESS_END',
  TRY_ACTIVATE = 'TRY_ACTIVATE',
}

/**
 * Event priorities — lower number = fires first when times are equal.
 * Matches the spec v1.1 ordering.
 */
export const EVENT_PRIORITY: Record<EventType, number> = {
  [EventType.SIMULATION_END]: 0,
  [EventType.BREAK_START]: 1,
  [EventType.BREAK_END]: 2,
  [EventType.PROCESS_END]: 3,
  [EventType.TRY_ACTIVATE]: 4,
};

export interface SimEvent {
  time: number;
  type: EventType;
  priority: number;
  /** Station index this event relates to (-1 for global) */
  stationIndex: number;
  /** Slot index within the station (-1 for station-level events like TRY_ACTIVATE) */
  slotIndex: number;
  /** Version counter to detect stale events (slot-level for PROCESS_END, station-level for TRY_ACTIVATE) */
  version: number;
}

export enum StationStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  BLOCKED = 'BLOCKED',
  ON_BREAK = 'ON_BREAK',
}

export interface Unit {
  id: string;
  createdAt: number;
  /** Rework attempts keyed by station id */
  reworkAttempts: Map<EntityId, number>;
  completedAt?: number;
}

/** Per-slot state within a station (supports capacity > 1 parallelism) */
export interface StationSlot {
  unit: Unit | null;
  remainingProcessingTime: number;
  /** Monotonic version counter — per-slot for PROCESS_END staleness */
  version: number;
  status: StationStatus;
  stateEnteredAt: number;
  /** Slot status before a break started (for resume) */
  preBreakStatus: StationStatus | null;
}

export interface InternalStationState {
  /** One slot per capacity unit; length = station.capacity */
  slots: StationSlot[];
  /** Deterministic defect accumulator (shared across slots) */
  defectAccumulator: number;
  /** Station-level version counter for TRY_ACTIVATE staleness */
  stationVersion: number;

  // ── Aggregate time tracking (summed across all slots) ──
  totalProcessingTime: number;
  totalBlockedTime: number;
  totalIdleTime: number;
  totalBreakTime: number;

  // ── Counters ──
  totalProcessed: number;
  totalScrapped: number;
  totalReworked: number;
  /** Sum of actual processing times for effectiveCT calculation */
  sumProcessingDurations: number;
}

export interface BufferEntry {
  unit: Unit;
  enqueuedAt: number;
}

export interface InternalBufferState {
  entries: BufferEntry[];
  /** Time-weighted accumulator for average queue length */
  weightedQueueSum: number;
  lastChangeTime: number;
  maxQueueLength: number;
  /** Total wait time of all units that have been dequeued */
  totalWaitTime: number;
  totalDequeued: number;
}
