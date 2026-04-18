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
} from './engine/types.js';

export {
  EventType,
  EVENT_PRIORITY,
  StationStatus,
} from './engine/types.js';

export { EventQueue } from './engine/event-queue.js';
export { LineState } from './engine/line-state.js';
export { runSimulation } from './engine/simulation.js';
export { collectStats } from './engine/stats.js';
export { detectBottleneck } from './engine/bottleneck.js';
export { generateRecommendations, resetRecommendationIds } from './engine/recommendations.js';
export { goldenScenarios, bottlingLine, electronicAssembly, pharmaPackaging } from './data/golden-scenarios.js';
