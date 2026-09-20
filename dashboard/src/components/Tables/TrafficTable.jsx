import { useState } from 'react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function TrafficTable({ packets = [], pagination, onPageChange, loading = false }) {
  const [sortCol, setSortCol] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const columns = [
    { key: 'timestamp', label: 'Time', render: (v) => formatTime(v) },
    { key: 'src_ip', label: 'Source IP' },
    { key: 'src_port', label: 'Src Port', render: (v) => v || '—' },
    { key: 'dst_ip', label: 'Destination IP' },
    { key: 'dst_port', label: 'Dst Port', render: (v) => v || '—' },
    { key: 'protocol', label: 'Protocol', render: (v) => (<span className={`protocol-badge ${v?.toLowerCase()}`}>{v}</span>) },
    { key: 'size', label: 'Size', render: (v) => formatBytes(v) },
    { key: 'flags', label: 'Flags', render: (v) => v || '—' },
  ];

  if (!packets.length && !loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">—</div>
        <div className="empty-state-title">No traffic records</div>
        <div className="empty-state-text">Captured packets will appear here</div>
      </div>
    );
  }

  return (
    <div>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => {
                  if (sortCol === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortCol(col.key); setSortDir('desc'); }
                }} style={{ cursor: 'pointer' }}>
                  {col.label}
                  {sortCol === col.key && (<span style={{ marginLeft: 4, opacity: 0.5 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 40 }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : (
              packets.map((pkt, i) => (
                <tr key={pkt.id || i}>
                  {columns.map(col => (<td key={col.key}>{col.render ? col.render(pkt[col.key]) : pkt[col.key]}</td>))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => onPageChange?.(pagination.page - 1)}>PREV</button>
          <span className="pagination-info">Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} records</span>
          <button className="pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange?.(pagination.page + 1)}>NEXT</button>
        </div>
      )}
    </div>
  );
}
