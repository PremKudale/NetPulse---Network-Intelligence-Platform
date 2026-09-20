import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnomalyFeed from '../components/Widgets/AnomalyFeed';
import StatCard from '../components/Widgets/StatCard';
import { IconAlertTriangle, IconShield, IconActivity, IconBarChart } from '../components/Icons';
import { useSocketFeed } from '../hooks/useSocket';
import { getAnomalies, getAnomalySummary, resolveAnomaly } from '../api/http';
import * as mock from '../utils/mockData';

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState(mock.generateAnomalies(8));
  const [summary, setSummary] = useState(mock.generateAnomalySummary());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const { items: liveAnomalies } = useSocketFeed('anomaly:new', 50);

  useEffect(() => {
    async function fetch() {
      try {
        const [anomRes, sumRes] = await Promise.allSettled([
          getAnomalies({ resolved: 'false', limit: 100 }), getAnomalySummary(),
        ]);
        if (anomRes.status === 'fulfilled' && anomRes.value?.data?.length > 0) setAnomalies(anomRes.value.data);
        if (sumRes.status === 'fulfilled' && sumRes.value?.total > 0) setSummary(sumRes.value);
      } catch (e) { /* keep mock */ }
      setLoading(false);
    }
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  const allAnomalies = [...liveAnomalies.filter(la => !anomalies.find(a => a.id === la.id)), ...anomalies];
  const filteredAnomalies = filter === 'all' ? allAnomalies : allAnomalies.filter(a => a.severity === filter);

  const handleResolve = async (id) => {
    try { await resolveAnomaly(id); } catch (e) { /* ignore */ }
    setAnomalies(prev => prev.filter(a => a.id !== id));
  };

  const criticalCount = summary.by_severity?.find(s => s.severity === 'critical')?.count || 0;
  const warningCount = summary.by_severity?.find(s => s.severity === 'warning')?.count || 0;
  const infoCount = summary.by_severity?.find(s => s.severity === 'info')?.count || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconAlertTriangle /></span>Anomalies & Alerts</h1>
          <p className="page-subtitle">Network anomaly detection and alert management</p>
        </div>
      </div>
      <div className="stats-grid stagger-children">
        <StatCard icon={IconAlertTriangle} label="Critical" value={parseInt(criticalCount)} color="red" />
        <StatCard icon={IconShield} label="Warnings" value={parseInt(warningCount)} color="amber" />
        <StatCard icon={IconActivity} label="Info" value={parseInt(infoCount)} color="blue" />
        <StatCard icon={IconBarChart} label="Total Active" value={summary.total || 0} color="purple" />
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon"><IconAlertTriangle style={{ width: 14, height: 14 }} /></span>Active Anomalies</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {['all', 'critical', 'warning', 'info'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
          : <AnomalyFeed anomalies={filteredAnomalies} onResolve={handleResolve} maxItems={50} />}
      </div>
    </motion.div>
  );
}
