interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function KpiCard({ label, value, unit }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">
        {typeof value === 'number' ? formatValue(value) : value}
        {unit && <span className="kpi-card__unit">{unit}</span>}
      </div>
    </div>
  );
}

function formatValue(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.001) return v.toFixed(4);
  return v.toExponential(2);
}
