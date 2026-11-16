import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import AnomalyFeed from '../components/Widgets/AnomalyFeed';
import StatCard from '../components/Widgets/StatCard';
import { IconAlertTriangle, IconShield, IconActivity, IconBarChart } from '../components/Icons';
import { useSocketFeed } from '../hooks/useSocket';
import { getAnomalies, getAnomalySummary, resolveAnomaly } from '../api/http';
import * as mock from '../utils/mockData';

// ── Type metadata for filter chips ────────────────────────
const ANOMALY_TYPES = [
  { key: 'all',                label: 'All' },
  { key: 'bandwidth_spike',    label: 'Bandwidth' },
  { key: 'port_scan',          label: 'Port Scan' },
  { key: 'traffic_flood',      label: 'Flood' },
  { key: 'dns_anomaly',        label: 'DNS' },
  { key: 'unusual_protocol',   label: 'Protocol' },
  { key: 'new_device',         label: 'Device' },
  { key: 'connection_anomaly', label: 'Connection' },
  { key: 'arp_spoofing',       label: 'ARP Spoof' },
  { key: 'geo_anomaly',        label: 'Geo' },
  { key: 'payload_anomaly',    label: 'Payload' },
];

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState(mock.generateAnomalies(12));
  const [summary, setSummary] = useState(mock.generateAnomalySummary());
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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

  // Apply both severity + type filters
  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter(a => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      return true;
    });
  }, [allAnomalies, severityFilter, typeFilter]);

  // Compute type distribution counts for the badge pills
  const typeCounts = useMemo(() => {
    const counts = {};
    for (const a of allAnomalies) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [allAnomalies]);

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

      {/* ── Anomaly Type Breakdown ──────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <span className="card-title-icon"><IconBarChart style={{ width: 14, height: 14 }} /></span>
            Anomaly Type Breakdown
          </span>
        </div>
        <div className="anomaly-type-grid">
          {ANOMALY_TYPES.filter(t => t.key !== 'all').map(t => {
            const count = typeCounts[t.key] || 0;
            if (count === 0) return null;
            return (
              <button
                key={t.key}
                className={`anomaly-type-chip ${typeFilter === t.key ? 'active' : ''}`}
                onClick={() => setTypeFilter(typeFilter === t.key ? 'all' : t.key)}
              >
                <span className="anomaly-type-chip-count">{count}</span>
                <span className="anomaly-type-chip-label">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Anomaly Feed with Filters ──────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon"><IconAlertTriangle style={{ width: 14, height: 14 }} /></span>Active Anomalies</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Severity filters */}
            {['all', 'critical', 'warning', 'info'].map(f => (
              <button key={f} className={`btn btn-sm ${severityFilter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSeverityFilter(f)}>{f.toUpperCase()}</button>
            ))}
            <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            {/* Type filters */}
            <select
              className="anomaly-type-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              {ANOMALY_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.label}{t.key !== 'all' && typeCounts[t.key] ? ` (${typeCounts[t.key]})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
          : <AnomalyFeed anomalies={filteredAnomalies} onResolve={handleResolve} maxItems={50} />}
      </div>
    </motion.div>
  );
}
