import { useState } from 'react';
import { motion } from 'framer-motion';
import IntelligenceFlowGraph from '../components/Flow/IntelligenceFlowGraph';
import { IconActivity, IconZap, IconShield, IconLayers, IconTrendingUp, IconRadio } from '../components/Icons';
import { useSocket, useSocketStatus } from '../hooks/useSocket';

export default function PipelineFlow() {
  const { isConnected } = useSocketStatus();
  const { data: bandwidth } = useSocket('stats:bandwidth', { packets_per_sec: 0, bytes_per_sec: 0 });
  const [activeTab, setActiveTab] = useState('pipeline');

  const stats = [
    { label: 'Active Synapses', value: '35 Paths', icon: IconZap, color: '#f59e0b', sub: 'Bi-directional flows' },
    { label: 'Telemetry Rate', value: `${bandwidth?.packets_per_sec || 30} pps`, icon: IconRadio, color: '#10b981', sub: 'Real-time wire ingestion' },
    { label: 'Detection Heuristics', value: '4 Engines', icon: IconShield, color: '#f43f5e', sub: 'Spike · Scan · Flood · Rogue' },
    { label: 'Processing Latency', value: '< 2.4 ms', icon: IconActivity, color: '#06b6d4', sub: 'Sub-second WebSocket dispatch' },
  ];

  return (
    <div style={{ padding: '24px 32px 48px', overflowY: 'auto', height: '100%' }}>
      {/* ── Page Header ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4',
              padding: '3px 8px', borderRadius: 4, fontSize: '0.62rem',
              fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)', border: '1px solid rgba(6, 182, 212, 0.3)',
            }}>
              DATA PIPELINE ARCHITECTURE
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
              color: isConnected ? 'var(--green)' : 'var(--red)',
            }}>
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
              {isConnected ? 'LIVE SOCKET STREAMING' : 'OFFLINE SIMULATOR'}
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            Telemetry Pipeline & Intelligence Map
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4, maxWidth: 640 }}>
            Visual mapping of how raw Layer 3/4 wire frames transition through deep packet inspection,
            statistical anomaly scoring, and real-time SecOps dispatch.
          </p>
        </div>

        {/* Action tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${activeTab === 'pipeline' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('pipeline')}
            style={{ fontSize: '0.72rem', padding: '7px 14px' }}
          >
            Neural Flow Map
          </button>
          <button
            className={`btn ${activeTab === 'specs' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('specs')}
            style={{ fontSize: '0.72rem', padding: '7px 14px' }}
          >
            Heuristic Specs
          </button>
        </div>
      </motion.div>

      {/* ── Key Metrics Ribbon ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${s.color}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: s.color,
              border: `1px solid ${s.color}30`,
            }}>
              <s.icon style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Main Neural Flow Visualization ────────────────── */}
      {activeTab === 'pipeline' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ marginBottom: 32 }}
        >
          <IntelligenceFlowGraph isCompact={false} />
        </motion.div>
      )}

      {/* ── Heuristic Specifications Tab ──────────────────── */}
      {activeTab === 'specs' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}
        >
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconTrendingUp style={{ color: '#f59e0b', width: 18, height: 18 }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Gaussian Baseline Formula</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              NetPulse computes rolling standard deviations of network throughput. If current traffic exceeds the mean plus two standard deviations, a threshold anomaly is generated.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#ffc857',
              border: '1px solid rgba(245,166,35,0.2)',
            }}>
              Threshold = μ + (2.0 × σ)
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconShield style={{ color: '#f43f5e', width: 18, height: 18 }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Port Sweep Heuristic</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Maintains an in-memory 10-second sliding window per source IP address. If distinct destination port requests exceed 20 ports in under 10 seconds, it triggers an immediate Port Scan threat.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#fb7185',
              border: '1px solid rgba(244,63,94,0.2)',
            }}>
              Cardinality(dst_ports, window=10s) &gt; 20
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconZap style={{ color: '#10b981', width: 18, height: 18 }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>PPS Flood Sentinel</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Detects denial-of-service burst attacks and packet amplification. Individual endpoint packet counts are evaluated against a 500 packets/second saturation barrier.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#34d399',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              PacketsPerSecond(host) &gt; 500 pkts/s
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconLayers style={{ color: '#06b6d4', width: 18, height: 18 }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Top-Talker Attribution</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Continuous sorting of high-bandwidth hosts utilizing a streaming heavy-hitter algorithm to prevent network interface starvation and isolate rogue downloads.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#22d3ee',
              border: '1px solid rgba(6,182,212,0.2)',
            }}>
              TopK(device_stats, order=total_bytes DESC)
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Architecture Pipeline Stages Breakdown ────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card"
        style={{ padding: 24 }}
      >
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 6 }}>
          SYSTEM BLUEPRINT
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16 }}>
          Telemetry Processing Pipeline Lifecycle
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, padding: 16 }}>
            <div style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 800, marginBottom: 6 }}>
              01 · SIGNALS
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>Raw Wire Ingestion</div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Hardware NIC capture using promiscuous sockets. Ingests raw frames without altering IP stack headers.
            </p>
          </div>

          <div style={{ background: 'rgba(244, 63, 94, 0.04)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 8, padding: 16 }}>
            <div style={{ color: '#f43f5e', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 800, marginBottom: 6 }}>
              02 · INTELLIGENCE
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>DPI &amp; Flow Pairing</div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Header dissection separates TCP, UDP, ICMP, DNS. Ephemeral ports are aggregated into 5-tuple socket pairs.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8, padding: 16 }}>
            <div style={{ color: '#10b981', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 800, marginBottom: 6 }}>
              03 · CONTEXT
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>Heuristic Engine</div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Traffic velocities are compared with Gaussian baselines to spot volumetric spikes, port sweeps, and floods.
            </p>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: 8, padding: 16 }}>
            <div style={{ color: '#06b6d4', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 800, marginBottom: 6 }}>
              04 · OUTCOMES
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>SecOps &amp; Streaming</div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Sub-second Socket.IO broadcasts stream 60 FPS bandwidth curves and immediate anomaly alert dispatches.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
