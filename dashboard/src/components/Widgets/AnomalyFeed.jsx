function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const SEVERITY_MARKERS = {
  critical: { color: 'var(--red)', label: 'CRITICAL' },
  warning: { color: 'var(--accent)', label: 'WARNING' },
  info: { color: 'var(--blue)', label: 'INFO' },
};

// ── Type-specific configurations ──────────────────────────
const TYPE_CONFIG = {
  bandwidth_spike: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    label: 'BANDWIDTH',
    color: '#f59e0b',
  },
  port_scan: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    label: 'PORT SCAN',
    color: '#ef4444',
  },
  traffic_flood: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M9 21v-2a4 4 0 0 1 3-3.87" />
        <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    label: 'FLOOD',
    color: '#dc2626',
  },
  dns_anomaly: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    label: 'DNS',
    color: '#8b5cf6',
  },
  unusual_protocol: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    label: 'PROTOCOL',
    color: '#06b6d4',
  },
  new_device: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    label: 'NEW DEVICE',
    color: '#10b981',
  },
  connection_anomaly: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    label: 'CONNECTION',
    color: '#f97316',
  },
  arp_spoofing: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    label: 'ARP SPOOF',
    color: '#e11d48',
  },
  geo_anomaly: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: 'GEO',
    color: '#a855f7',
  },
  payload_anomaly: {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    label: 'PAYLOAD',
    color: '#64748b',
  },
};

const DEFAULT_TYPE_CONFIG = {
  icon: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  label: 'ALERT',
  color: '#94a3b8',
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
        const severity = SEVERITY_MARKERS[anomaly.severity] || SEVERITY_MARKERS.info;
        const typeConf = TYPE_CONFIG[anomaly.type] || DEFAULT_TYPE_CONFIG;
        return (
          <div key={anomaly.id || i} className={`anomaly-item ${anomaly.severity || 'info'}`}>
            <div
              className="anomaly-type-icon"
              style={{ color: typeConf.color, background: `${typeConf.color}15` }}
            >
              {typeConf.icon}
            </div>
            <div className="anomaly-content">
              <div className="anomaly-header-row">
                <div className="anomaly-title">{anomaly.title}</div>
                <span
                  className="anomaly-type-badge"
                  style={{ color: typeConf.color, borderColor: `${typeConf.color}40` }}
                >
                  {typeConf.label}
                </span>
              </div>
              <div className="anomaly-description">{anomaly.description}</div>
              <div className="anomaly-meta">
                {anomaly.src_ip && <span>SRC {anomaly.src_ip}</span>}
                {anomaly.dst_ip && <span>DST {anomaly.dst_ip}</span>}
                {anomaly.protocol && <span className="anomaly-proto-tag">{anomaly.protocol}</span>}
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
