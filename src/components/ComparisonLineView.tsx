// ─── PlantFlow Twin — Comparative Line Visualization ───
// Side-by-side SVG line views for baseline vs variant.

import type { Station, Buffer, StationMetrics } from '../engine/types';
import { stationDisplayName, formatPct } from '../lib/format';

interface ComparisonLineViewProps {
  stations: Station[];
  buffers: Buffer[];
  baselineMetrics: StationMetrics[];
  variantMetrics: StationMetrics[];
  baselineBottleneckId: string;
  variantBottleneckId: string;
}

function renderLine(
  stations: Station[],
  buffers: Buffer[],
  metrics: StationMetrics[],
  bottleneckId: string,
  label: string,
  yOffset: number,
): { elements: React.ReactNode[]; width: number } {
  const stationW = 120;
  const stationH = 68;
  const bufferW = 48;
  const gap = 10;
  const padding = 20;

  let x = padding;
  const elements: React.ReactNode[] = [];

  // Label
  elements.push(
    <text
      key={`label-${label}`}
      x={padding}
      y={yOffset - 8}
      fill="#737373"
      fontSize={10}
      fontWeight={600}
      fontFamily="system-ui, sans-serif"
      letterSpacing="0.08em"
      style={{ textTransform: 'uppercase' }}
    >
      {label}
    </text>,
  );

  stations.forEach((station, i) => {
    const m = metrics[i];
    const isBn = station.id === bottleneckId;
    const util = m.utilization;
    const name = stationDisplayName(station);

    const fillColor = isBn ? '#2d1215' : utilFill(util);
    const strokeColor = isBn ? '#ef4444' : '#333333';
    const strokeW = isBn ? 2 : 1;

    elements.push(
      <g key={`${label}-station-${station.id}`}>
        <rect
          x={x} y={yOffset} width={stationW} height={stationH}
          rx={6} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW}
        />
        <text
          x={x + stationW / 2} y={yOffset + 16} textAnchor="middle"
          fill={isBn ? '#fca5a5' : '#e5e5e5'} fontSize={10} fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {name}
        </text>
        {/* Utilization bar */}
        <rect x={x + 10} y={yOffset + 26} width={stationW - 20} height={5} rx={2.5} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
        <rect x={x + 10} y={yOffset + 26} width={(stationW - 20) * Math.min(util, 1)} height={5} rx={2.5} fill={isBn ? '#ef4444' : utilBarColor(util)} />
        <text
          x={x + stationW / 2} y={yOffset + 44} textAnchor="middle"
          fill={util > 0.85 ? '#eab308' : '#a3a3a3'} fontSize={9} fontFamily="monospace"
        >
          {formatPct(util)}
        </text>
        {isBn && (
          <text
            x={x + stationW / 2} y={yOffset + 58} textAnchor="middle"
            fill="#ef4444" fontSize={8} fontWeight={700}
            fontFamily="system-ui, sans-serif" letterSpacing="0.04em"
          >
            ▲ BN
          </text>
        )}
      </g>,
    );

    x += stationW;

    if (i < buffers.length) {
      x += gap;
      const bufY = yOffset + stationH / 2 - 12;
      elements.push(
        <g key={`${label}-buffer-${buffers[i].id}`}>
          <rect
            x={x} y={bufY} width={bufferW} height={24}
            rx={4} fill="#111" stroke="#333" strokeWidth={1} strokeDasharray="4,2"
          />
          <text
            x={x + bufferW / 2} y={bufY + 14} textAnchor="middle"
            fill="#525252" fontSize={8} fontFamily="monospace"
          >
            {isFinite(buffers[i].capacity) ? buffers[i].capacity : '∞'}
          </text>
        </g>,
      );
      x += bufferW + gap;
    }
  });

  return { elements, width: x + padding };
}

function utilFill(u: number): string {
  if (u > 0.85) return '#1a1712';
  if (u > 0.6) return '#161616';
  return '#131313';
}

function utilBarColor(u: number): string {
  if (u > 0.85) return '#eab308';
  if (u > 0.6) return '#3b82f6';
  return '#22c55e';
}

export function ComparisonLineView({
  stations,
  buffers,
  baselineMetrics,
  variantMetrics,
  baselineBottleneckId,
  variantBottleneckId,
}: ComparisonLineViewProps) {
  const rowHeight = 100;
  const rowGap = 24;

  const baseline = renderLine(stations, buffers, baselineMetrics, baselineBottleneckId, 'Baseline', 20);
  const variant = renderLine(stations, buffers, variantMetrics, variantBottleneckId, 'Variant', 20 + rowHeight + rowGap);

  const totalW = Math.max(baseline.width, variant.width);
  const totalH = 20 + rowHeight * 2 + rowGap + 20;

  return (
    <div className="line-view">
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ minWidth: totalW, display: 'block' }}
      >
        {/* Separator */}
        <line
          x1={0} y1={20 + rowHeight + rowGap / 2}
          x2={totalW} y2={20 + rowHeight + rowGap / 2}
          stroke="#262626" strokeWidth={1} strokeDasharray="6,4"
        />
        {baseline.elements}
        {variant.elements}
      </svg>
    </div>
  );
}
