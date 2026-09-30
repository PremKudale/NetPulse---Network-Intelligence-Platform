import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import StatCard from '../components/Widgets/StatCard';
import BandwidthChart from '../components/Charts/BandwidthChart';
import ProtocolPie from '../components/Charts/ProtocolPie';
import TopDevices from '../components/Widgets/TopDevices';
import AnomalyFeed from '../components/Widgets/AnomalyFeed';
import TrafficFlowSankey from '../components/Charts/TrafficFlowSankey';
import PacketConsole from '../components/Widgets/PacketConsole';
import { IconWifi, IconMonitor, IconZap, IconAlertTriangle, IconTrendingUp, IconLayers, IconActivity, IconRadio } from '../components/Icons';
import { useSocket, useSocketFeed } from '../hooks/useSocket';
import { getSummary, getBandwidth, getProtocols, getTopDevices, getAnomalies, getFlows } from '../api/http';
import * as mock from '../utils/mockData';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i] + '/s';
}

function IconBarChart(props) {
  return <svg className="icon" viewBox="0 0 24 24" {...props}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>;
}
function IconGlobe(props) {
  return <svg className="icon" viewBox="0 0 24 24" {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
}

export default function Overview() {
  const [summary, setSummary] = useState(mock.generateSummary());
  const [bandwidth, setBandwidth] = useState(mock.generateBandwidthHistory(60));
  const [protocols, setProtocols] = useState(mock.generateProtocols());
  const [topDevices, setTopDevicesData] = useState(mock.generateDevices());
  const [anomalies, setAnomalies] = useState(mock.generateAnomalies());
  const [flows, setFlows] = useState(mock.generateFlows(20));

  const { data: liveBandwidth } = useSocket('stats:bandwidth');
  const { data: liveSummary } = useSocket('stats:summary');
  const { data: liveProtocols } = useSocket('stats:protocols');
  const { data: liveDevices } = useSocket('stats:devices');
  const { items: liveAnomalies } = useSocketFeed('anomaly:new', 20);

  // Simulate live bandwidth ticking
  const tickRef = useRef(null);
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setBandwidth(prev => {
        const last = prev[prev.length - 1];
        const base = last?.bytes_per_sec || 12000000;
        const noise = 0.85 + Math.random() * 0.3;
        const spike = Math.random() > 0.93 ? (1.5 + Math.random()) : 1;
        return [...prev.slice(-59), {
          time: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          bytes_per_sec: Math.round(base * noise * spike),
          packets_per_sec: Math.round((base * noise * spike) / 1200),
        }];
      });
    }, 3000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Try to fetch from live API, keep mock data as fallback
  useEffect(() => {
    async function fetchData() {
      try {
        const [sumRes, bwRes, protoRes, devRes, anomRes, flowRes] = await Promise.allSettled([
          getSummary(), getBandwidth(1), getProtocols(), getTopDevices(10),
          getAnomalies({ resolved: 'false', limit: 10 }), getFlows({ limit: 20 }),
        ]);
        if (sumRes.status === 'fulfilled' && sumRes.value?.total_devices > 0) setSummary(sumRes.value);
        if (bwRes.status === 'fulfilled' && bwRes.value?.data?.length > 0) setBandwidth(bwRes.value.data);
        if (protoRes.status === 'fulfilled') {
          const p = protoRes.value.hourly || protoRes.value.current || [];
          if (p.length > 0) setProtocols(p);
        }
        if (devRes.status === 'fulfilled' && devRes.value?.data?.length > 0) setTopDevicesData(devRes.value.data);
        if (anomRes.status === 'fulfilled' && anomRes.value?.data?.length > 0) setAnomalies(anomRes.value.data);
        if (flowRes.status === 'fulfilled' && flowRes.value?.data?.length > 0) setFlows(flowRes.value.data);
      } catch (e) { /* use mock data */ }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (liveBandwidth) setBandwidth(prev => [...prev.slice(-59), liveBandwidth]); }, [liveBandwidth]);
  useEffect(() => { if (liveSummary) setSummary(prev => ({ ...prev, ...liveSummary })); }, [liveSummary]);
  useEffect(() => { if (liveProtocols?.length) setProtocols(liveProtocols); }, [liveProtocols]);
  useEffect(() => { if (liveDevices?.length) setTopDevicesData(liveDevices); }, [liveDevices]);

  const displayAnomalies = liveAnomalies.length > 0 ? liveAnomalies : anomalies;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconBarChart /></span>Network Overview</h1>
          <p className="page-subtitle">Real-time network intelligence dashboard</p>
        </div>
        <span className="card-badge live">● LIVE</span>
      </div>

      <div className="stats-grid stagger-children">
        <StatCard icon={IconRadio} label="Current Bandwidth" value={formatBytes(summary.current_bandwidth_bps || 0)} color="amber" trendLabel="real-time" />
        <StatCard icon={IconMonitor} label="Active Devices" value={summary.active_devices || 0} color="green" trend={1} trendLabel={`of ${summary.total_devices || 0} total`} />
        <StatCard icon={IconZap} label="Packets / Sec" value={summary.current_packets_per_sec || 0} unit="pps" color="blue" />
        <StatCard icon={IconAlertTriangle} label="Active Alerts" value={summary.active_anomalies || 0} color={summary.critical_anomalies > 0 ? 'red' : 'amber'} trend={summary.critical_anomalies > 0 ? -1 : 0} trendLabel={summary.critical_anomalies > 0 ? `${summary.critical_anomalies} critical` : 'all clear'} />
      </div>

      <div className="bento-grid">
        <div className="card span-3">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconTrendingUp style={{ width: 14, height: 14 }} /></span>Live Bandwidth</span>
            <span className="card-badge live">● STREAMING</span>
          </div>
          <BandwidthChart data={bandwidth} height={270} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconLayers style={{ width: 14, height: 14 }} /></span>Protocols</span>
          </div>
          <ProtocolPie data={protocols} height={270} />
        </div>
        <div className="card span-2">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconActivity style={{ width: 14, height: 14 }} /></span>Top Bandwidth Consumers</span>
          </div>
          <TopDevices devices={topDevices} limit={5} />
        </div>
        <div className="card span-2">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconGlobe style={{ width: 14, height: 14 }} /></span>Traffic Flows</span>
          </div>
          <TrafficFlowSankey data={flows} height={230} />
        </div>
        <div className="card span-4">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconAlertTriangle style={{ width: 14, height: 14 }} /></span>Recent Anomalies</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{displayAnomalies.length} active</span>
          </div>
          <AnomalyFeed anomalies={displayAnomalies} maxItems={5} />
        </div>
        <div className="card span-4" style={{ padding: 0, overflow: 'hidden' }}>
          <PacketConsole maxLines={35} speed="normal" />
        </div>
      </div>
    </motion.div>
  );
}
