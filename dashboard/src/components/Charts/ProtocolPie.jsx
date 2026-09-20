import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PROTOCOL_COLORS = {
  TCP: '#448aff', UDP: '#b388ff', ICMP: '#18ffff', DNS: '#00e676',
  ARP: '#f5a623', HTTP: '#4ade80', HTTPS: '#22c55e', SSH: '#ff3b3b', OTHER: '#555566',
};

function getColor(protocol) { return PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.OTHER; }

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label" style={{ color: data.payload.fill }}>{data.name}</div>
      <div className="tooltip-value">{formatBytes(data.value)}</div>
      <div className="tooltip-value" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
        {data.payload.packet_count?.toLocaleString()} packets
      </div>
    </div>
  );
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: '0.6rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function ProtocolPie({ data = [], height = 280 }) {
  const chartData = data.filter(d => d.byte_count > 0).map(d => ({
    name: d.protocol, value: d.byte_count, packet_count: d.packet_count, fill: getColor(d.protocol),
  }));

  if (chartData.length === 0) {
    return (
      <div className="empty-state" style={{ height }}>
        <div className="empty-state-icon">—</div>
        <div className="empty-state-text">No protocol data available</div>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}
            dataKey="value" labelLine={false} label={CustomLabel} animationBegin={0} animationDuration={700}>
            {chartData.map((entry, index) => (<Cell key={index} fill={entry.fill} stroke="transparent" />))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={32} formatter={(value) => (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', fontFamily: 'JetBrains Mono' }}>{value}</span>
          )} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
