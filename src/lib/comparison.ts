// ─── PlantFlow Twin — Comparison Helpers ───
// Compute structured deltas between baseline and variant simulation results.

import type { SimulationResult, StationMetrics } from '../engine/types';

export interface KpiDelta {
  label: string;
  baselineValue: number;
  variantValue: number;
  absoluteDelta: number;
  percentDelta: number;
  /** true if positive delta = improvement for this KPI */
  higherIsBetter: boolean;
  unit: string;
  formatFn?: (v: number) => string;
}

export interface StationComparison {
  stationId: string;
  baselineUtilization: number;
  variantUtilization: number;
  utilizationDelta: number;
  baselineBlocking: number;
  variantBlocking: number;
  blockingDelta: number;
  baselineStarvation: number;
  variantStarvation: number;
  starvationDelta: number;
  wasBottleneck: boolean;
  isBottleneck: boolean;
}

export interface ComparisonResult {
  kpis: KpiDelta[];
  stations: StationComparison[];
  baselineBottleneckId: string;
  variantBottleneckId: string;
  bottleneckChanged: boolean;
}

function pctDelta(before: number, after: number): number {
  if (before === 0) return after === 0 ? 0 : 100;
  return ((after - before) / Math.abs(before)) * 100;
}

export function compareResults(
  baseline: SimulationResult,
  variant: SimulationResult,
): ComparisonResult {
  const bs = baseline.summary;
  const vs = variant.summary;

  const kpis: KpiDelta[] = [
    {
      label: 'Throughput',
      baselineValue: bs.throughput * 3600,
      variantValue: vs.throughput * 3600,
      absoluteDelta: (vs.throughput - bs.throughput) * 3600,
      percentDelta: pctDelta(bs.throughput, vs.throughput),
      higherIsBetter: true,
      unit: 'units/hr',
    },
    {
      label: 'Lead Time',
      baselineValue: bs.averageLeadTime,
      variantValue: vs.averageLeadTime,
      absoluteDelta: vs.averageLeadTime - bs.averageLeadTime,
      percentDelta: pctDelta(bs.averageLeadTime, vs.averageLeadTime),
      higherIsBetter: false,
      unit: 's',
    },
    {
      label: 'Average WIP',
      baselineValue: bs.averageWIP,
      variantValue: vs.averageWIP,
      absoluteDelta: vs.averageWIP - bs.averageWIP,
      percentDelta: pctDelta(bs.averageWIP, vs.averageWIP),
      higherIsBetter: false,
      unit: 'units',
    },
    {
      label: 'Total Produced',
      baselineValue: bs.totalProduced,
      variantValue: vs.totalProduced,
      absoluteDelta: vs.totalProduced - bs.totalProduced,
      percentDelta: pctDelta(bs.totalProduced, vs.totalProduced),
      higherIsBetter: true,
      unit: 'units',
    },
    {
      label: 'Total Scrapped',
      baselineValue: bs.totalScrapped,
      variantValue: vs.totalScrapped,
      absoluteDelta: vs.totalScrapped - bs.totalScrapped,
      percentDelta: pctDelta(bs.totalScrapped, vs.totalScrapped),
      higherIsBetter: false,
      unit: 'units',
    },
  ];

  // Station-level comparison
  const baselineBnId = baseline.bottleneck.stationId;
  const variantBnId = variant.bottleneck.stationId;

  const metricsMap = new Map<string, StationMetrics>();
  for (const m of variant.stationMetrics) {
    metricsMap.set(m.stationId, m);
  }

  const stations: StationComparison[] = baseline.stationMetrics.map((bm) => {
    const vm = metricsMap.get(bm.stationId);
    return {
      stationId: bm.stationId,
      baselineUtilization: bm.utilization,
      variantUtilization: vm?.utilization ?? 0,
      utilizationDelta: (vm?.utilization ?? 0) - bm.utilization,
      baselineBlocking: bm.blockingRate,
      variantBlocking: vm?.blockingRate ?? 0,
      blockingDelta: (vm?.blockingRate ?? 0) - bm.blockingRate,
      baselineStarvation: bm.starvationRate,
      variantStarvation: vm?.starvationRate ?? 0,
      starvationDelta: (vm?.starvationRate ?? 0) - bm.starvationRate,
      wasBottleneck: bm.stationId === baselineBnId,
      isBottleneck: bm.stationId === variantBnId,
    };
  });

  return {
    kpis,
    stations,
    baselineBottleneckId: baselineBnId,
    variantBottleneckId: variantBnId,
    bottleneckChanged: baselineBnId !== variantBnId,
  };
}

/** Determine if a delta represents an improvement. */
export function isImproved(delta: KpiDelta): boolean {
  if (delta.higherIsBetter) return delta.absoluteDelta > 0;
  return delta.absoluteDelta < 0;
}

/** Determine if a delta represents a worsening. */
export function isWorsened(delta: KpiDelta): boolean {
  if (delta.higherIsBetter) return delta.absoluteDelta < 0;
  return delta.absoluteDelta > 0;
}
