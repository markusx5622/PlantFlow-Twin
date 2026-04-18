// ─── PlantFlow Twin — Variant Scenario Helpers ───
// Create variant scenarios by cloning a baseline and applying parameter changes.
// Engine-first: variants are full Scenario objects ready for simulation.

import type { Scenario, ScenarioChange } from '../engine/types';

/** Deep clone a scenario, assigning a new variant ID and name. */
export function cloneScenario(scenario: Scenario, variantLabel?: string): Scenario {
  const label = variantLabel ?? 'Variant';
  const clone: Scenario = JSON.parse(JSON.stringify(scenario));
  clone.id = `${scenario.id}--variant`;
  clone.name = `${scenario.name} — ${label}`;
  clone.description = `${label} derived from "${scenario.name}"`;
  return clone;
}

/** A single parameter edit the user can make in the Lab. */
export interface ParameterEdit {
  /** 'station' or 'buffer' */
  targetType: 'station' | 'buffer';
  /** Entity ID of the station or buffer */
  targetId: string;
  /** Field name to change */
  field: string;
  /** New numeric value */
  newValue: number;
}

/**
 * Apply a list of parameter edits to a scenario (mutates in place).
 * Returns the ScenarioChange[] for tracking.
 */
export function applyEdits(scenario: Scenario, edits: ParameterEdit[]): ScenarioChange[] {
  const changes: ScenarioChange[] = [];

  for (const edit of edits) {
    if (edit.targetType === 'station') {
      const station = scenario.lineModel.stations.find((s) => s.id === edit.targetId);
      if (!station) continue;
      const field = edit.field as keyof typeof station;
      const oldValue = station[field] as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (station as any)[field] = edit.newValue;
      changes.push({
        type: 'MODIFY_STATION',
        targetId: edit.targetId,
        field: edit.field,
        oldValue,
        newValue: edit.newValue,
      });
    } else if (edit.targetType === 'buffer') {
      const buffer = scenario.lineModel.buffers.find((b) => b.id === edit.targetId);
      if (!buffer) continue;
      const field = edit.field as keyof typeof buffer;
      const oldValue = buffer[field] as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (buffer as any)[field] = edit.newValue;
      changes.push({
        type: 'MODIFY_BUFFER',
        targetId: edit.targetId,
        field: edit.field,
        oldValue,
        newValue: edit.newValue,
      });
    }
  }

  return changes;
}

/**
 * Create a variant scenario from a baseline by cloning and applying edits.
 * Does NOT mutate the baseline.
 */
export function createVariant(
  baseline: Scenario,
  edits: ParameterEdit[],
  label?: string,
): { variant: Scenario; changes: ScenarioChange[] } {
  const variant = cloneScenario(baseline, label);
  const changes = applyEdits(variant, edits);
  return { variant, changes };
}

/**
 * Convert a Recommendation's ScenarioChange into a ParameterEdit.
 */
export function recommendationToEdit(change: ScenarioChange): ParameterEdit {
  const targetType = change.type === 'MODIFY_BUFFER' ? 'buffer' : 'station';
  return {
    targetType,
    targetId: change.targetId,
    field: change.field,
    newValue: typeof change.newValue === 'number' ? change.newValue : parseFloat(String(change.newValue)),
  };
}
