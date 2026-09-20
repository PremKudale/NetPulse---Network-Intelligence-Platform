import { useMemo } from 'react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const FLOW_COLORS = [
  '#f5a623', '#00e676', '#448aff', '#b388ff', '#18ffff',
  '#ff3b3b', '#ffc857', '#4ade80', '#818cf8', '#f472b6',
];

export default function TrafficFlowSankey({ data = [], height = 300 }) {
  const flows = useMemo(() => {
    return data
      .filter(f => f.total_bytes > 0 && f.src_ip !== '0.0.0.0' && f.dst_ip !== '0.0.0.0')
      .sort((a, b) => b.total_bytes - a.total_bytes)
      .slice(0, 10);
  }, [data]);

  const maxBytes = Math.max(...flows.map(f => f.total_bytes), 1);

  if (flows.length === 0) {
    return (
      <div className="empty-state" style={{ height }}>
        <div className="empty-state-icon">—</div>
        <div className="empty-state-text">No flow data available</div>
      </div>
    );
  }

  return (
    <div style={{ height, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '2px 0' }}>
        {flows.map((flow, i) => {
          const widthPct = Math.max((flow.total_bytes / maxBytes) * 100, 8);
          const color = FLOW_COLORS[i % FLOW_COLORS.length];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: 105, textAlign: 'right', fontSize: '0.7rem' }}>
                {flow.src_ip}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>→</span>
              <div style={{ flex: 1, position: 'relative', height: 16 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 1, bottom: 1,
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${color}33, ${color}55)`,
                  border: `1px solid ${color}44`,
                  borderRadius: 2, transition: 'width 0.5s ease',
                  display: 'flex', alignItems: 'center', paddingLeft: 5,
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {formatBytes(flow.total_bytes)}
                  </span>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: 105, fontSize: '0.7rem' }}>
                {flow.dst_ip}
              </span>
              <span className={`protocol-badge ${flow.protocol?.toLowerCase()}`}>{flow.protocol}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
