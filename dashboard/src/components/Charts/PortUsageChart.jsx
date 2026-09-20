import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const WELL_KNOWN_PORTS = {
  20: 'FTP-D', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
  53: 'DNS', 67: 'DHCP', 68: 'DHCP', 80: 'HTTP', 110: 'POP3',
  143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
  3306: 'MySQL', 3389: 'RDP', 5432: 'PgSQL', 8080: 'HTTP-A', 8443: 'HTTPS-A',
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">Port {data.port} ({data.service})</div>
      <div className="tooltip-value">{formatBytes(data.byte_count)}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'JetBrains Mono' }}>
        {data.connection_count?.toLocaleString()} connections · {data.protocol}
      </div>
    </div>
  );
}

export default function PortUsageChart({ data = [], height = 300 }) {
  const chartData = data.slice(0, 12).map(d => ({
    ...d, service: WELL_KNOWN_PORTS[d.port] || `P${d.port}`, label: `${WELL_KNOWN_PORTS[d.port] || d.port}`,
  })).sort((a, b) => b.byte_count - a.byte_count);

  const colors = ['#f5a623', '#ffc857', '#00e676', '#18ffff', '#448aff', '#b388ff',
                  '#f5a623', '#ffc857', '#00e676', '#18ffff', '#448aff', '#b388ff'];

  if (chartData.length === 0) {
    return (
      <div className="empty-state" style={{ height }}>
        <div className="empty-state-icon">—</div>
        <div className="empty-state-text">No port data available</div>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tickFormatter={formatBytes} stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} width={50} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="byte_count" radius={[0, 4, 4, 0]} animationDuration={600}>
            {chartData.map((entry, index) => (<Cell key={index} fill={colors[index % colors.length]} fillOpacity={0.8} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
