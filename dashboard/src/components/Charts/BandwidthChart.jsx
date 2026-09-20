import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{formatTime(label)}</div>
      {payload.map((entry, i) => (
        <div key={i} className="tooltip-value" style={{ color: entry.color }}>
          {entry.name === 'bytes_per_sec'
            ? `${formatBytes(entry.value)}/s`
            : `${entry.value} pps`}
        </div>
      ))}
    </div>
  );
}

export default function BandwidthChart({ data = [], height = 250 }) {
  const chartData = data.map(d => ({
    ...d,
    time: d.time || d.timestamp,
  }));

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bandwidthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5a623" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f5a623" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="ppsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00ff88" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatBytes}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fontSize: 10 }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="bytes_per_sec"
            stroke="#f5a623"
            strokeWidth={2}
            fill="url(#bandwidthGradient)"
            name="bytes_per_sec"
            animationDuration={500}
            dot={false}
            activeDot={{ r: 4, fill: '#f5a623', stroke: '#0a0a0f', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
