import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BandwidthChart from '../components/Charts/BandwidthChart';
import ProtocolPie from '../components/Charts/ProtocolPie';
import StatCard from '../components/Widgets/StatCard';
import { IconClock, IconTrendingUp, IconBarChart, IconDatabase } from '../components/Icons';
import { getBandwidth, getProtocols, getSummary } from '../api/http';
import * as mock from '../utils/mockData';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Historical() {
  const [bandwidth, setBandwidth] = useState(mock.generateBandwidthHistory(120));
  const [protocols, setProtocols] = useState(mock.generateProtocols());
  const [summary, setSummary] = useState(mock.generateSummary());
  const [timeRange, setTimeRange] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const [bwRes, protoRes, sumRes] = await Promise.allSettled([getBandwidth(timeRange), getProtocols(), getSummary()]);
        if (bwRes.status === 'fulfilled' && bwRes.value?.data?.length > 0) setBandwidth(bwRes.value.data);
        if (protoRes.status === 'fulfilled') {
          const p = protoRes.value.hourly || protoRes.value.current || [];
          if (p.length > 0) setProtocols(p);
        }
        if (sumRes.status === 'fulfilled' && sumRes.value?.total_devices > 0) setSummary(sumRes.value);
      } catch (e) { /* keep mock */ }
      setLoading(false);
    }
    fetch();
  }, [timeRange]);

  const avgBandwidth = bandwidth.length > 0 ? Math.round(bandwidth.reduce((s, b) => s + (b.bytes_per_sec || 0), 0) / bandwidth.length) : 0;
  const peakBandwidth = bandwidth.length > 0 ? Math.max(...bandwidth.map(b => b.bytes_per_sec || 0)) : 0;
  const totalTransferred = bandwidth.length > 0 ? bandwidth.reduce((s, b) => s + (b.bytes_per_sec || 0) * 5, 0) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconClock /></span>Historical Analysis</h1>
          <p className="page-subtitle">Network traffic trends and historical data</p>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {[{ label: '1H', value: 1 }, { label: '6H', value: 6 }, { label: '12H', value: 12 }, { label: '24H', value: 24 }].map(range => (
            <button key={range.value} className={`btn btn-sm ${timeRange === range.value ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTimeRange(range.value)}>{range.label}</button>
          ))}
        </div>
      </div>
      <div className="stats-grid stagger-children">
        <StatCard icon={IconBarChart} label="Avg Bandwidth" value={formatBytes(avgBandwidth) + '/s'} color="amber" />
        <StatCard icon={IconTrendingUp} label="Peak Bandwidth" value={formatBytes(peakBandwidth) + '/s'} color="green" />
        <StatCard icon={IconDatabase} label="Total Transferred" value={formatBytes(totalTransferred)} color="blue" />
        <StatCard icon={IconClock} label="Data Points" value={bandwidth.length} color="purple" />
      </div>
      <div className="bento-grid">
        <div className="card span-3">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconTrendingUp style={{ width: 14, height: 14 }} /></span>Bandwidth History — Last {timeRange}h</span>
          </div>
          <BandwidthChart data={bandwidth} height={340} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconBarChart style={{ width: 14, height: 14 }} /></span>Protocol Share</span>
          </div>
          <ProtocolPie data={protocols} height={340} />
        </div>
        <div className="card span-4">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconDatabase style={{ width: 14, height: 14 }} /></span>Network Summary</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, padding: '6px 0' }}>
            {[
              { label: 'Total Packets', value: (summary.total_packets || 0).toLocaleString() },
              { label: 'Total Bytes', value: formatBytes(summary.total_bytes || 0) },
              { label: 'Total Devices', value: summary.total_devices || 0 },
              { label: 'Active Devices', value: summary.active_devices || 0 },
              { label: 'Active Anomalies', value: summary.active_anomalies || 0 },
              { label: 'Top Protocol', value: summary.top_protocol || 'N/A' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div className="label" style={{ marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
