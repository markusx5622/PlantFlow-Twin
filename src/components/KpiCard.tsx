interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  secondary?: string;
  highlight?: boolean;
}

export function KpiCard({ label, value, unit, secondary, highlight }: KpiCardProps) {
  return (
    <div className={`kpi-card${highlight ? ' kpi-card--highlight' : ''}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">
        {typeof value === 'number' ? formatValue(value) : value}
        {unit && <span className="kpi-card__unit">{unit}</span>}
      </div>
      {secondary && <div className="kpi-card__secondary">{secondary}</div>}
    </div>
  );
}

function formatValue(v: number): string {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 100) return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (v >= 1) return v.toFixed(1);
  if (v >= 0.01) return v.toFixed(2);
  return v.toFixed(4);
}
