import type { Recommendation } from '../lib/run-scenario';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No recommendations generated.</p>;
  }

  return (
    <div className="rec-list">
      {recommendations.map((rec) => (
        <div key={rec.id} className="rec-item">
          <div className="rec-item__header">
            <span className={`rec-item__type rec-item__type--${rec.effort.toLowerCase()}`}>
              {rec.effort} effort
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
              {rec.type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="rec-item__rationale">{rec.rationale}</div>
          <div className="rec-item__improvement">↗ {rec.expectedImprovement}</div>
        </div>
      ))}
    </div>
  );
}
