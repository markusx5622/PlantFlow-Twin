import type { Recommendation } from '../lib/run-scenario';
import type { Station } from '../engine/types';
import { recTypeLabel, effortLabel } from '../lib/format';

interface RecommendationListProps {
  recommendations: Recommendation[];
  stations: Station[];
}

export function RecommendationList({ recommendations, stations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
        No recommendations generated for this scenario.
      </p>
    );
  }

  const stationName = (id: string): string => {
    const s = stations.find((st) => st.id === id);
    return s?.name ?? id;
  };

  return (
    <div className="rec-list">
      {recommendations.map((rec) => {
        const effortClass = rec.effort.toLowerCase();
        const targetName = stationName(rec.targetId) || rec.targetId;

        return (
          <div key={rec.id} className="rec-item">
            <div className="rec-item__header">
              <span className={`rec-item__type rec-item__type--${effortClass}`}>
                {effortLabel(rec.effort)}
              </span>
            </div>
            <div className="rec-item__title">{recTypeLabel(rec.type)}</div>
            <div className="rec-item__target">
              Target: {targetName}
              {rec.change.field && ` · ${rec.change.field}: ${rec.change.oldValue} → ${rec.change.newValue}`}
            </div>
            <div className="rec-item__rationale">{rec.rationale}</div>
            <div className="rec-item__improvement">
              <span>↗</span> Expected impact: {rec.expectedImprovement}
            </div>
          </div>
        );
      })}
    </div>
  );
}
