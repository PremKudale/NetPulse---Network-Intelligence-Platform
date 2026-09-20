import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DeviceList from '../components/Widgets/DeviceList';
import StatCard from '../components/Widgets/StatCard';
import { IconMonitor, IconWifi, IconBarChart, IconServer } from '../components/Icons';
import { useSocket } from '../hooks/useSocket';
import { getDevices } from '../api/http';
import * as mock from '../utils/mockData';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Devices() {
  const [devices, setDevices] = useState(mock.generateDevices());
  const [loading, setLoading] = useState(false);
  const { data: liveDevices } = useSocket('stats:devices');

  useEffect(() => {
    async function fetch() {
      try {
        const res = await getDevices({ limit: 200 });
        if (res.data?.length > 0) setDevices(res.data);
      } catch (e) { /* keep mock */ }
      setLoading(false);
    }
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (liveDevices?.length) setDevices(liveDevices); }, [liveDevices]);

  const activeCount = devices.filter(d => d.last_seen && (Date.now() - new Date(d.last_seen).getTime()) < 300000).length;
  const totalTraffic = devices.reduce((sum, d) => sum + (d.total_bytes_sent || 0) + (d.total_bytes_recv || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconMonitor /></span>Network Devices</h1>
          <p className="page-subtitle">All discovered devices on the network</p>
        </div>
      </div>
      <div className="stats-grid stagger-children">
        <StatCard icon={IconServer} label="Total Devices" value={devices.length} color="amber" />
        <StatCard icon={IconWifi} label="Active Devices" value={activeCount} color="green" trendLabel="last 5 min" />
        <StatCard icon={IconBarChart} label="Total Traffic" value={formatBytes(totalTraffic)} color="blue" />
        <StatCard icon={IconMonitor} label="Avg per Device" value={devices.length > 0 ? formatBytes(Math.round(totalTraffic / devices.length)) : '0 B'} color="purple" />
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon"><IconMonitor style={{ width: 14, height: 14 }} /></span>Device Activity</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{devices.length} devices</span>
        </div>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div> : <DeviceList devices={devices} maxItems={50} />}
      </div>
    </motion.div>
  );
}
