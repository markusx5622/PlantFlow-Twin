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
      fill="#5a6070"
      fontSize={10}
      fontWeight={600}
      fontFamily="Inter, system-ui, sans-serif"
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

    const fillColor = isBn ? '#2a1018' : utilFill(util);
    const strokeColor = isBn ? '#f06060' : '#23262b';
    const strokeW = isBn ? 2 : 1;

    elements.push(
      <g key={`${label}-station-${station.id}`}>
        <rect
          x={x} y={yOffset} width={stationW} height={stationH}
          rx={8} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW}
        />
        <text
          x={x + stationW / 2} y={yOffset + 16} textAnchor="middle"
          fill={isBn ? '#fca5a5' : '#eaedf2'} fontSize={10} fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {name}
        </text>
        {/* Utilization bar */}
        <rect x={x + 10} y={yOffset + 26} width={stationW - 20} height={5} rx={2.5} fill="#16181b" stroke="#23262b" strokeWidth={0.5} />
        <rect x={x + 10} y={yOffset + 26} width={(stationW - 20) * Math.min(util, 1)} height={5} rx={2.5} fill={isBn ? '#f06060' : utilBarColor(util)} />
        <text
          x={x + stationW / 2} y={yOffset + 44} textAnchor="middle"
          fill={util > 0.85 ? '#f0b429' : '#8b919e'} fontSize={9} fontFamily="monospace"
        >
          {formatPct(util)}
        </text>
        {isBn && (
          <text
            x={x + stationW / 2} y={yOffset + 58} textAnchor="middle"
            fill="#f06060" fontSize={8} fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.04em"
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
            rx={4} fill="#0f1012" stroke="#23262b" strokeWidth={1} strokeDasharray="4,2"
          />
          <text
            x={x + bufferW / 2} y={bufY + 14} textAnchor="middle"
            fill="#3d4250" fontSize={8} fontFamily="monospace"
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
  if (u > 0.85) return '#1c1810';
  if (u > 0.6) return '#141618';
  return '#111214';
}

function utilBarColor(u: number): string {
  if (u > 0.85) return '#f0b429';
  if (u > 0.6) return '#4e8cff';
  return '#2dd4a0';
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
          stroke="#23262b" strokeWidth={1} strokeDasharray="6,4"
        />
        {baseline.elements}
        {variant.elements}
      </svg>
    </div>
  );
}
