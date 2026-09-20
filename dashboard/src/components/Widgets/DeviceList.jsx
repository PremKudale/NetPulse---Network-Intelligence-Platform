function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(timestamp) {
  if (!timestamp) return 'N/A';
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function DeviceList({ devices = [], maxItems = 15 }) {
  const sorted = [...devices]
    .sort((a, b) => {
      const aTotal = (a.total_bytes_sent || 0) + (a.total_bytes_recv || 0);
      const bTotal = (b.total_bytes_sent || 0) + (b.total_bytes_recv || 0);
      return bTotal - aTotal;
    })
    .slice(0, maxItems);

  const maxTotal = Math.max(...sorted.map(d => (d.total_bytes_sent || 0) + (d.total_bytes_recv || 0)), 1);

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">—</div>
        <div className="empty-state-title">No devices detected</div>
        <div className="empty-state-text">Start the capture engine to discover devices</div>
      </div>
    );
  }

  return (
    <div className="device-list">
      {sorted.map((device, i) => {
        const total = (device.total_bytes_sent || 0) + (device.total_bytes_recv || 0);
        const pct = (total / maxTotal) * 100;
        return (
          <div key={device.ip || i} className="device-item" style={{ animationDelay: `${i * 0.03}s` }}>
            <span className={`status-dot ${device.last_seen && (Date.now() - new Date(device.last_seen).getTime()) < 300000 ? 'online' : 'warning'}`} />
            <span className="device-ip">{device.ip}</span>
            <div className="device-traffic">
              <div className="device-bar"><div className="device-bar-fill" style={{ width: `${pct}%` }} /></div>
            </div>
            <span className="device-bytes">{formatBytes(total)}</span>
            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', minWidth: 46, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {timeAgo(device.last_seen)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
