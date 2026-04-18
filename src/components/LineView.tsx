import type { Station, Buffer, StationMetrics } from '../lib/run-scenario';
import { stationDisplayName, formatPct } from '../lib/format';

interface LineViewProps {
  stations: Station[];
  buffers: Buffer[];
  metrics: StationMetrics[];
  bottleneckId: string;
}

/**
 * SVG-based horizontal line view showing stations, buffers, and key metrics.
 * Highlights the bottleneck station with a distinctive accent.
 */
export function LineView({ stations, buffers, metrics, bottleneckId }: LineViewProps) {
  const stationW = 140;
  const stationH = 88;
  const bufferW = 64;
  const gap = 12;
  const padding = 28;
  const totalW =
    stations.length * stationW +
    buffers.length * bufferW +
    (stations.length + buffers.length - 1) * gap +
    padding * 2;
  const totalH = stationH + 80 + padding * 2;

  let x = padding;

  const elements: React.ReactNode[] = [];

  stations.forEach((station, i) => {
    const m = metrics[i];
    const isBn = station.id === bottleneckId;
    const util = m.utilization;
    const displayName = stationDisplayName(station);

    // Station rect
    const fillColor = isBn ? '#2d1215' : utilFill(util);
    const strokeColor = isBn ? '#ef4444' : '#333333';
    const strokeWidth = isBn ? 2 : 1;

    elements.push(
      <g key={`station-${station.id}`}>
        {/* Station box */}
        <rect
          x={x}
          y={padding}
          width={stationW}
          height={stationH}
          rx={8}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Station name */}
        <text
          x={x + stationW / 2}
          y={padding + 20}
          textAnchor="middle"
          fill={isBn ? '#fca5a5' : '#e5e5e5'}
          fontSize={11}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {displayName}
        </text>

        {/* Utilization bar background */}
        <rect
          x={x + 12}
          y={padding + 32}
          width={stationW - 24}
          height={6}
          rx={3}
          fill="#1a1a1a"
          stroke="#333333"
          strokeWidth={0.5}
        />

        {/* Utilization bar fill */}
        <rect
          x={x + 12}
          y={padding + 32}
          width={(stationW - 24) * Math.min(util, 1)}
          height={6}
          rx={3}
          fill={isBn ? '#ef4444' : utilBarColor(util)}
        />

        {/* Utilization % */}
        <text
          x={x + stationW / 2}
          y={padding + 54}
          textAnchor="middle"
          fill={util > 0.85 ? '#eab308' : '#a3a3a3'}
          fontSize={11}
          fontFamily="monospace"
          fontWeight={500}
        >
          {formatPct(util)} utilization
        </text>

        {/* CT label */}
        <text
          x={x + stationW / 2}
          y={padding + 70}
          textAnchor="middle"
          fill="#737373"
          fontSize={9}
          fontFamily="monospace"
        >
          CT: {station.cycleTime}s · Avail: {formatPct(station.availability, 0)}
        </text>

        {/* Bottleneck indicator */}
        {isBn && (
          <g>
            <rect
              x={x + stationW / 2 - 42}
              y={padding + stationH + 6}
              width={84}
              height={18}
              rx={9}
              fill="rgba(239, 68, 68, 0.15)"
            />
            <text
              x={x + stationW / 2}
              y={padding + stationH + 18}
              textAnchor="middle"
              fill="#ef4444"
              fontSize={9}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
              letterSpacing="0.06em"
            >
              ▲ BOTTLENECK
            </text>
          </g>
        )}

        {/* Blocking/starvation below */}
        <text
          x={x + stationW / 2}
          y={padding + stationH + (isBn ? 38 : 18)}
          textAnchor="middle"
          fill="#525252"
          fontSize={8}
          fontFamily="monospace"
        >
          Block: {formatPct(m.blockingRate, 0)} · Starve: {formatPct(m.starvationRate, 0)}
        </text>
      </g>,
    );

    x += stationW;

    // Buffer between stations
    if (i < buffers.length) {
      const buf = buffers[i];
      x += gap;

      const bufY = padding + stationH / 2 - 16;
      const bufH = 32;

      elements.push(
        <g key={`buffer-${buf.id}`}>
          {/* Buffer rect */}
          <rect
            x={x}
            y={bufY}
            width={bufferW}
            height={bufH}
            rx={6}
            fill="#111111"
            stroke="#333333"
            strokeWidth={1}
            strokeDasharray="6,3"
          />
          {/* Capacity label */}
          <text
            x={x + bufferW / 2}
            y={bufY + 14}
            textAnchor="middle"
            fill="#737373"
            fontSize={9}
            fontFamily="monospace"
          >
            {isFinite(buf.capacity) ? `cap: ${buf.capacity}` : '∞'}
          </text>
          {/* Buffer label */}
          <text
            x={x + bufferW / 2}
            y={bufY + 25}
            textAnchor="middle"
            fill="#404040"
            fontSize={7}
            fontFamily="system-ui, sans-serif"
          >
            buffer
          </text>
          {/* Arrow */}
          <line
            x1={x + bufferW}
            y1={padding + stationH / 2}
            x2={x + bufferW + gap}
            y2={padding + stationH / 2}
            stroke="#404040"
            strokeWidth={1}
            markerEnd="url(#arrowhead)"
          />
        </g>,
      );

      x += bufferW + gap;
    }
  });

  return (
    <div className="line-view">
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ minWidth: totalW, display: 'block' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="5"
            refX="8"
            refY="2.5"
            orient="auto"
          >
            <polygon points="0 0, 8 2.5, 0 5" fill="#404040" />
          </marker>
        </defs>
        {elements}
      </svg>
    </div>
  );
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
