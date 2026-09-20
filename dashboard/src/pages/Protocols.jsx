import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProtocolPie from '../components/Charts/ProtocolPie';
import PortUsageChart from '../components/Charts/PortUsageChart';
import StatCard from '../components/Widgets/StatCard';
import { IconLayers, IconBarChart, IconZap, IconDatabase } from '../components/Icons';
import { useSocket } from '../hooks/useSocket';
import { getProtocols, getPorts } from '../api/http';
import * as mock from '../utils/mockData';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Protocols() {
  const [protocols, setProtocols] = useState(mock.generateProtocols());
  const [ports, setPorts] = useState(mock.generatePorts());
  const { data: liveProtocols } = useSocket('stats:protocols');

  useEffect(() => {
    async function fetch() {
      try {
        const [protoRes, portRes] = await Promise.allSettled([getProtocols(), getPorts(20)]);
        if (protoRes.status === 'fulfilled') {
          const p = protoRes.value.hourly || protoRes.value.current || [];
          if (p.length > 0) setProtocols(p);
        }
        if (portRes.status === 'fulfilled') {
          const pt = portRes.value.hourly || portRes.value.current || [];
          if (pt.length > 0) setPorts(pt);
        }
      } catch (e) { /* keep mock */ }
    }
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (liveProtocols?.length) setProtocols(liveProtocols); }, [liveProtocols]);

  const totalBytes = protocols.reduce((s, p) => s + (p.byte_count || 0), 0);
  const totalPackets = protocols.reduce((s, p) => s + (p.packet_count || 0), 0);
  const topProto = protocols.length > 0 ? [...protocols].sort((a, b) => b.byte_count - a.byte_count)[0] : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconLayers /></span>Protocol Analysis</h1>
          <p className="page-subtitle">Protocol distribution and port usage breakdown</p>
        </div>
      </div>
      <div className="stats-grid stagger-children">
        <StatCard icon={IconLayers} label="Total Protocols" value={protocols.length} color="amber" />
        <StatCard icon={IconZap} label="Top Protocol" value={topProto?.protocol || 'N/A'} color="green" />
        <StatCard icon={IconBarChart} label="Total Traffic" value={formatBytes(totalBytes)} color="blue" />
        <StatCard icon={IconDatabase} label="Total Packets" value={totalPackets} color="purple" />
      </div>
      <div className="bento-grid">
        <div className="card span-2">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconLayers style={{ width: 14, height: 14 }} /></span>Protocol Distribution</span>
            <span className="card-badge live">● LIVE</span>
          </div>
          <ProtocolPie data={protocols} height={340} />
        </div>
        <div className="card span-2">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconBarChart style={{ width: 14, height: 14 }} /></span>Port Usage</span>
          </div>
          <PortUsageChart data={ports} height={340} />
        </div>
        <div className="card span-4">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconDatabase style={{ width: 14, height: 14 }} /></span>Protocol Breakdown</span>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Protocol</th><th>Total Traffic</th><th>Packets</th><th>Share</th><th>Avg Packet Size</th></tr></thead>
              <tbody>
                {[...protocols].sort((a, b) => b.byte_count - a.byte_count).map((p, i) => (
                  <tr key={i}>
                    <td><span className={`protocol-badge ${p.protocol?.toLowerCase()}`}>{p.protocol}</span></td>
                    <td>{formatBytes(p.byte_count)}</td>
                    <td>{(p.packet_count || 0).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 50, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${totalBytes > 0 ? (p.byte_count / totalBytes * 100) : 0}%`, background: 'var(--accent)', borderRadius: 2 }} />
                        </div>
                        <span>{totalBytes > 0 ? (p.byte_count / totalBytes * 100).toFixed(1) : 0}%</span>
                      </div>
                    </td>
                    <td>{p.packet_count > 0 ? formatBytes(Math.round(p.byte_count / p.packet_count)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
