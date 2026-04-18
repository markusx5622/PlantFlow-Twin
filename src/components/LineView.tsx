import type { Station, Buffer, StationMetrics } from '../lib/run-scenario';

interface LineViewProps {
  stations: Station[];
  buffers: Buffer[];
  metrics: StationMetrics[];
  bottleneckId: string;
}

/**
 * SVG-based horizontal line view showing stations, buffers, and key metrics.
 * Highlights the bottleneck station.
 */
export function LineView({ stations, buffers, metrics, bottleneckId }: LineViewProps) {
  const stationW = 120;
  const stationH = 80;
  const bufferW = 60;
  const gap = 8;
  const padding = 24;
  const totalW =
    stations.length * stationW +
    buffers.length * bufferW +
    (stations.length + buffers.length - 1) * gap +
    padding * 2;
  const totalH = stationH + 80 + padding * 2; // extra space for labels below

  let x = padding;

  const elements: React.ReactNode[] = [];

  stations.forEach((station, i) => {
    const m = metrics[i];
    const isBn = station.id === bottleneckId;
    const util = m.utilization;

    // Station rect
    const fillColor = isBn ? '#7f1d1d' : utilColor(util);
    const strokeColor = isBn ? '#ef4444' : '#404040';

    elements.push(
      <g key={`station-${station.id}`}>
        <rect
          x={x}
          y={padding}
          width={stationW}
          height={stationH}
          rx={6}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isBn ? 2 : 1}
        />
        {/* Station name */}
        <text
          x={x + stationW / 2}
          y={padding + 22}
          textAnchor="middle"
          fill={isBn ? '#fca5a5' : '#e5e5e5'}
          fontSize={12}
          fontWeight={600}
        >
          {station.name}
        </text>
        {/* Utilization bar */}
        <rect
          x={x + 10}
          y={padding + 34}
          width={(stationW - 20) * Math.min(util, 1)}
          height={6}
          rx={3}
          fill={isBn ? '#ef4444' : '#3b82f6'}
        />
        <rect
          x={x + 10}
          y={padding + 34}
          width={stationW - 20}
          height={6}
          rx={3}
          fill="none"
          stroke="#404040"
          strokeWidth={0.5}
        />
        {/* Util% text */}
        <text
          x={x + stationW / 2}
          y={padding + 56}
          textAnchor="middle"
          fill="#a3a3a3"
          fontSize={10}
          fontFamily="monospace"
        >
          {(util * 100).toFixed(1)}% util
        </text>
        {/* CT label below */}
        <text
          x={x + stationW / 2}
          y={padding + 70}
          textAnchor="middle"
          fill="#737373"
          fontSize={9}
          fontFamily="monospace"
        >
          CT: {station.cycleTime}s
        </text>
        {/* Bottleneck label */}
        {isBn && (
          <text
            x={x + stationW / 2}
            y={padding + stationH + 18}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={10}
            fontWeight={600}
          >
            ▲ BOTTLENECK
          </text>
        )}
        {/* Blocking/starvation indicators below line */}
        <text
          x={x + stationW / 2}
          y={padding + stationH + (isBn ? 34 : 18)}
          textAnchor="middle"
          fill="#737373"
          fontSize={8}
          fontFamily="monospace"
        >
          B:{(m.blockingRate * 100).toFixed(0)}% S:{(m.starvationRate * 100).toFixed(0)}%
        </text>
      </g>,
    );

    x += stationW;

    // Buffer between stations
    if (i < buffers.length) {
      const buf = buffers[i];
      x += gap;

      elements.push(
        <g key={`buffer-${buf.id}`}>
          {/* Buffer diamond/rect */}
          <rect
            x={x}
            y={padding + stationH / 2 - 15}
            width={bufferW}
            height={30}
            rx={4}
            fill="#1a1a1a"
            stroke="#404040"
            strokeWidth={1}
            strokeDasharray="4,2"
          />
          <text
            x={x + bufferW / 2}
            y={padding + stationH / 2 - 1}
            textAnchor="middle"
            fill="#737373"
            fontSize={8}
            fontFamily="monospace"
          >
            {isFinite(buf.capacity) ? `cap:${buf.capacity}` : '∞'}
          </text>
          <text
            x={x + bufferW / 2}
            y={padding + stationH / 2 + 10}
            textAnchor="middle"
            fill="#525252"
            fontSize={7}
            fontFamily="monospace"
          >
            {buf.name}
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
            markerWidth="6"
            markerHeight="4"
            refX="6"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#404040" />
          </marker>
        </defs>
        {elements}
      </svg>
    </div>
  );
}

function utilColor(u: number): string {
  if (u > 0.85) return '#1c1917'; // dark warm
  if (u > 0.6) return '#171717';
  return '#141414';
}
