// ─── PlantFlow Twin — Engine Adapter for Web UI ───
// Thin wrapper to run scenarios from the engine without coupling React to internals.

import { runSimulation } from '../engine/simulation';
import { goldenScenarios } from '../data/golden-scenarios';
import type { Scenario, SimulationResult } from '../engine/types';

export type { Scenario, SimulationResult };
export type {
  SimulationSummary,
  StationMetrics,
  BufferMetrics,
  BottleneckResult,
  Recommendation,
  Station,
  Buffer,
  Shift,
  ShiftBreak,
} from '../engine/types';

/** Run a scenario through the real DES engine. */
export function executeScenario(scenario: Scenario): SimulationResult {
  return runSimulation(scenario);
}

/** Get all golden scenarios. */
export function getGoldenScenarios(): Scenario[] {
  return goldenScenarios;
}

/** Find a golden scenario by ID. */
export function getScenarioById(id: string): Scenario | undefined {
  return goldenScenarios.find((s) => s.id === id);
}

/** Run all golden scenarios and return results. */
export function runAllGoldenScenarios(): { scenario: Scenario; result: SimulationResult }[] {
  return goldenScenarios.map((scenario) => ({
    scenario,
    result: runSimulation(scenario),
  }));
}
