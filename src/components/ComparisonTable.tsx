// ─── PlantFlow Twin — KPI Comparison Table ───
// Before/after comparison with deltas and visual indicators.

import type { KpiDelta } from '../lib/comparison';
import { isImproved, isWorsened } from '../lib/comparison';

interface ComparisonTableProps {
  kpis: KpiDelta[];
}

function formatNumber(v: number, unit: string): string {
  if (unit === 'units/hr') return v.toFixed(1);
  if (unit === 's') return v.toFixed(1);
  if (unit === 'units') return Math.round(v).toLocaleString('en-US');
  return v.toFixed(2);
}

function deltaClass(kpi: KpiDelta): string {
  if (Math.abs(kpi.percentDelta) < 0.1) return '';
  if (isImproved(kpi)) return 'delta--improved';
  if (isWorsened(kpi)) return 'delta--worsened';
  return '';
}

function deltaArrow(kpi: KpiDelta): string {
  if (Math.abs(kpi.percentDelta) < 0.1) return '—';
  if (isImproved(kpi)) return '▲';
  if (isWorsened(kpi)) return '▼';
  return '—';
}

export function ComparisonTable({ kpis }: ComparisonTableProps) {
  return (
    <div className="data-table__wrap">
      <table className="data-table comparison-table">
        <thead>
          <tr>
            <th>KPI</th>
            <th>Baseline</th>
            <th>Variant</th>
            <th>Δ Absolute</th>
            <th>Δ Percent</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((kpi) => {
            const cls = deltaClass(kpi);
            const arrow = deltaArrow(kpi);
            const improved = isImproved(kpi);
            const worsened = isWorsened(kpi);

            return (
              <tr key={kpi.label} className={cls}>
                <td style={{ fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{kpi.label}</td>
                <td>{formatNumber(kpi.baselineValue, kpi.unit)} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{kpi.unit}</span></td>
                <td>{formatNumber(kpi.variantValue, kpi.unit)} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{kpi.unit}</span></td>
                <td className={cls}>
                  {kpi.absoluteDelta > 0 ? '+' : ''}{formatNumber(kpi.absoluteDelta, kpi.unit)}
                </td>
                <td className={cls}>
                  {kpi.percentDelta > 0 ? '+' : ''}{kpi.percentDelta.toFixed(1)}%
                </td>
                <td>
                  <span className={`comparison-impact ${improved ? 'comparison-impact--positive' : worsened ? 'comparison-impact--negative' : 'comparison-impact--neutral'}`}>
                    {arrow} {improved ? 'Improved' : worsened ? 'Worsened' : 'No change'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
