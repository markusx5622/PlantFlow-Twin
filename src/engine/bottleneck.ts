// ─── PlantFlow Twin — Bottleneck Detection ───
// Composite score per spec v1.1:
//   score = w_util * utilNorm + w_queue * queueNorm
//         + w_starve * downstreamStarvation + w_block * inverseBlocking

import {
  BottleneckResult,
  BottleneckScore,
  StationMetrics,
  BufferMetrics,
  LineModel,
} from './types.js';

const W_UTIL = 0.35;
const W_QUEUE = 0.25;
const W_STARVE = 0.20;
const W_BLOCK = 0.20;

export function detectBottleneck(
  stationMetrics: StationMetrics[],
  bufferMetrics: BufferMetrics[],
  model: LineModel,
): BottleneckResult {
  const n = stationMetrics.length;
  if (n === 0) {
    return emptyResult();
  }

  // Pre-compute normalization maxima
  const maxUtil = Math.max(...stationMetrics.map((m) => m.utilization), 1e-9);
  const maxQueue =
    bufferMetrics.length > 0
      ? Math.max(...bufferMetrics.map((m) => m.averageQueueLength), 1e-9)
      : 1;

  const scores: BottleneckScore[] = stationMetrics.map((sm, i) => {
    // 1) Utilization normalized
    const utilNorm = sm.utilization / maxUtil;

    // 2) Upstream queue normalized (buffer feeding this station = buffers[i-1])
    let queueNorm = 0;
    if (i > 0 && bufferMetrics.length >= i) {
      queueNorm = bufferMetrics[i - 1].averageQueueLength / maxQueue;
    }

    // 3) Average starvation of all downstream stations
    let downstreamStarvation = 0;
    if (i < n - 1) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) {
        sum += stationMetrics[j].starvationRate;
      }
      downstreamStarvation = sum / (n - 1 - i);
    }

    // 4) Inverse blocking: less blocking → more likely bottleneck
    const inverseBlocking = 1 - sm.blockingRate;

    const score =
      W_UTIL * utilNorm +
      W_QUEUE * queueNorm +
      W_STARVE * downstreamStarvation +
      W_BLOCK * inverseBlocking;

    return { stationId: sm.stationId, score };
  });

  // Sort by score descending
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted.length > 1 ? sorted[1] : { score: 0 };

  // Confidence: how dominant the top score is
  const totalScore = sorted.reduce((s, x) => s + x.score, 0);
  const confidence = totalScore > 0 ? top.score / totalScore : 0;

  const gap = top.score - second.score;
  const topMetrics = stationMetrics.find((m) => m.stationId === top.stationId)!;

  const explanation = buildExplanation(top.stationId, topMetrics, gap, model);

  return {
    stationId: top.stationId,
    score: round4(top.score),
    confidence: round4(confidence),
    method: 'composite-v1',
    allScores: scores.map((s) => ({ stationId: s.stationId, score: round4(s.score) })),
    explanation,
  };
}

function buildExplanation(
  stationId: string,
  metrics: StationMetrics,
  gap: number,
  model: LineModel,
): string {
  const station = model.stations.find((s) => s.id === stationId);
  const name = station?.name ?? stationId;
  const parts: string[] = [
    `Station "${name}" identified as bottleneck (score gap: ${round4(gap)}).`,
  ];
  if (metrics.utilization > 0.85) {
    parts.push(`High utilization (${(metrics.utilization * 100).toFixed(1)}%).`);
  }
  if (metrics.blockingRate < 0.05) {
    parts.push('Low blocking rate suggests downstream is not the constraint.');
  }
  if (metrics.starvationRate < 0.05) {
    parts.push('Low starvation rate confirms adequate upstream supply.');
  }
  return parts.join(' ');
}

function emptyResult(): BottleneckResult {
  return {
    stationId: '',
    score: 0,
    confidence: 0,
    method: 'composite-v1',
    allScores: [],
    explanation: 'No stations to analyze.',
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
