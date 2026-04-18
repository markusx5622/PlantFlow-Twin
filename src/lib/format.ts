// ─── PlantFlow Twin — Display Format Utilities ───
// Presentation-layer helpers for human-readable labels, units, and formatting.
// No engine logic — only display concerns.

import type { Station, Buffer } from '../engine/types';

// ─── Station & Buffer Display Names ───

/** Map of station IDs to human-friendly display names. Falls back to station.name. */
const STATION_DISPLAY_NAMES: Record<string, string> = {
  's-fill': 'Filling Station',
  's-cap': 'Capping Station',
  's-label': 'Labeling Station',
  's-package': 'Packaging Station',
  's-smt': 'SMT Placement',
  's-reflow': 'Reflow Soldering',
  's-aoi': 'AOI Inspection',
  's-ict': 'ICT Testing',
  's-coat': 'Conformal Coating',
  's-pfill': 'Filling Station',
  's-seal': 'Sealing Station',
  's-plabel': 'Labeling Station',
  's-box': 'Boxing Station',
};

/** Map of buffer IDs to human-friendly display names. Falls back to buffer.name. */
const BUFFER_DISPLAY_NAMES: Record<string, string> = {
  'b-fill-cap': 'Fill → Cap Buffer',
  'b-cap-label': 'Cap → Label Buffer',
  'b-label-pkg': 'Label → Package Buffer',
  'b-smt-reflow': 'SMT → Reflow Buffer',
  'b-reflow-aoi': 'Reflow → AOI Buffer',
  'b-aoi-ict': 'AOI → ICT Buffer',
  'b-ict-coat': 'ICT → Coating Buffer',
  'b-fill-seal': 'Fill → Seal Buffer',
  'b-seal-label': 'Seal → Label Buffer',
  'b-label-box': 'Label → Box Buffer',
};

/** Get display-friendly name for a station. */
export function stationDisplayName(station: Station): string {
  return STATION_DISPLAY_NAMES[station.id] ?? station.name;
}

/** Get display-friendly name for a buffer. */
export function bufferDisplayName(buffer: Buffer): string {
  return BUFFER_DISPLAY_NAMES[buffer.id] ?? buffer.name;
}

// ─── KPI Formatting ───

/** Format throughput: prefer units/hour for better readability. */
export function formatThroughput(unitsPerSecond: number): { value: string; unit: string } {
  const perHour = unitsPerSecond * 3600;
  if (perHour >= 1) {
    return { value: perHour.toFixed(1), unit: 'units/hr' };
  }
  // Very low throughput — show per minute
  const perMin = unitsPerSecond * 60;
  return { value: perMin.toFixed(2), unit: 'units/min' };
}

/** Format lead time in human-friendly units. */
export function formatLeadTime(seconds: number): { value: string; unit: string } {
  if (seconds >= 3600) {
    return { value: (seconds / 3600).toFixed(1), unit: 'hours' };
  }
  if (seconds >= 60) {
    return { value: (seconds / 60).toFixed(1), unit: 'min' };
  }
  return { value: seconds.toFixed(1), unit: 'sec' };
}

/** Format a percentage value (0–1) to display string. */
export function formatPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

/** Format a count with optional suffix. */
export function formatCount(v: number): string {
  if (v >= 10000) return v.toLocaleString('en-US');
  return v.toString();
}

/** Format a decimal number to consistent precision. */
export function formatDecimal(v: number, decimals = 2): string {
  return v.toFixed(decimals);
}

/** Format wait time in readable form. */
export function formatWaitTime(seconds: number): string {
  if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)} min`;
  }
  return `${seconds.toFixed(1)}s`;
}

// ─── Bottleneck Confidence ───

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface ConfidenceDisplay {
  level: ConfidenceLevel;
  color: 'success' | 'warning' | 'danger';
  label: string;
}

/** Convert a raw 0–1 confidence score to a human-readable confidence level. */
export function formatConfidence(confidence: number): ConfidenceDisplay {
  if (confidence >= 0.4) {
    return { level: 'High', color: 'success', label: 'High confidence' };
  }
  if (confidence >= 0.28) {
    return { level: 'Medium', color: 'warning', label: 'Medium confidence' };
  }
  return { level: 'Low', color: 'danger', label: 'Low confidence' };
}

// ─── Recommendation Type Display ───

const REC_TYPE_LABELS: Record<string, string> = {
  REDUCE_CYCLE_TIME: 'Reduce Cycle Time',
  IMPROVE_AVAILABILITY: 'Improve Availability',
  INCREASE_BUFFER: 'Increase Buffer Capacity',
  REDUCE_DEFECTS: 'Reduce Defect Rate',
  ADD_PARALLEL_CAPACITY: 'Add Parallel Capacity',
};

/** Get a human-friendly label for a recommendation type. */
export function recTypeLabel(type: string): string {
  return REC_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Duration Formatting ───

/** Format a duration in seconds to human-readable form. */
export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)} min`;
  }
  return `${seconds}s`;
}

/** Effort level human labels. */
export function effortLabel(effort: string): string {
  switch (effort) {
    case 'LOW': return 'Quick Win';
    case 'MEDIUM': return 'Moderate Effort';
    case 'HIGH': return 'Major Investment';
    default: return effort;
  }
}
