function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function TopDevices({ devices = [], limit = 5 }) {
  const sorted = [...devices]
    .map(d => ({ ...d, total: (d.total_bytes_sent || 0) + (d.total_bytes_recv || 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  const maxTotal = sorted[0]?.total || 1;

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">—</div>
        <div className="empty-state-text">No device data available</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((device, i) => {
        const pct = (device.total / maxTotal) * 100;
        return (
          <div key={device.ip || i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700, color: 'var(--accent)', width: 18, textAlign: 'center' }}>
                  #{i + 1}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  {device.ip}
                </span>
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {formatBytes(device.total)}
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: i === 0 ? 'linear-gradient(90deg, #f5a623, #ffc857)' : i === 1 ? 'linear-gradient(90deg, #448aff, #82b1ff)' : 'linear-gradient(90deg, var(--text-muted), var(--text-secondary))',
                borderRadius: 2, transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TX {formatBytes(device.total_bytes_sent || 0)}</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>RX {formatBytes(device.total_bytes_recv || 0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
