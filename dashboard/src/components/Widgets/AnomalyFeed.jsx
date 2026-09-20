function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const SEVERITY_MARKERS = {
  critical: { color: 'var(--red)', symbol: '●' },
  warning: { color: 'var(--accent)', symbol: '●' },
  info: { color: 'var(--blue)', symbol: '●' },
};

export default function AnomalyFeed({ anomalies = [], onResolve, maxItems = 20 }) {
  const items = anomalies.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--green)' }}>●</div>
        <div className="empty-state-title">No anomalies detected</div>
        <div className="empty-state-text">Network operating within normal parameters</div>
      </div>
    );
  }

  return (
    <div className="anomaly-feed">
      {items.map((anomaly, i) => {
        const marker = SEVERITY_MARKERS[anomaly.severity] || SEVERITY_MARKERS.info;
        return (
          <div key={anomaly.id || i} className={`anomaly-item ${anomaly.severity || 'info'}`}>
            <span className="anomaly-icon" style={{ color: marker.color, fontSize: '0.6rem', marginTop: 3 }}>
              {marker.symbol}
            </span>
            <div className="anomaly-content">
              <div className="anomaly-title">{anomaly.title}</div>
              <div className="anomaly-description">{anomaly.description}</div>
              <div className="anomaly-meta">
                {anomaly.src_ip && <span>SRC {anomaly.src_ip}</span>}
                {anomaly.dst_ip && <span>DST {anomaly.dst_ip}</span>}
                <span>{timeAgo(anomaly.timestamp)}</span>
              </div>
            </div>
            {onResolve && !anomaly.resolved && (
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onResolve(anomaly.id); }}>
                RESOLVE
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
