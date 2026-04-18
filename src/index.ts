// ─── PlantFlow Twin — Barrel Export ───
export type {
  EntityId,
  Station,
  Buffer,
  ShiftBreak,
  Shift,
  LineModel,
  SimulationConfig,
  Scenario,
  SimulationSummary,
  StationMetrics,
  BufferMetrics,
  BottleneckScore,
  BottleneckResult,
  RecommendationEffort,
  ScenarioChangeType,
  ScenarioChange,
  Recommendation,
  SimulationResult,
  SimEvent,
  Unit,
  InternalStationState,
  InternalBufferState,
  BufferEntry,
} from './engine/types';

export {
  EventType,
  EVENT_PRIORITY,
  StationStatus,
} from './engine/types';

export { EventQueue } from './engine/event-queue';
export { LineState } from './engine/line-state';
export { runSimulation } from './engine/simulation';
export { collectStats } from './engine/stats';
export { detectBottleneck } from './engine/bottleneck';
export { generateRecommendations, resetRecommendationIds } from './engine/recommendations';
export { goldenScenarios, bottlingLine, electronicAssembly, pharmaPackaging } from './data/golden-scenarios';
