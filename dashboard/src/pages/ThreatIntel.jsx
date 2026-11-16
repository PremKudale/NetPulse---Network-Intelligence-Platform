import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

/* ================================================================
   THREAT INTELLIGENCE & DEEP PACKET INSPECTION
   Security command center with threat scoring, TLS analysis,
   MITRE ATT&CK threat feed, cipher analysis, and protocol matrix.
   ================================================================ */

// ── SVG Icons ────────────────────────────────────────────────
function IconShieldCheck(p) {
  return <svg className="icon" viewBox="0 0 24 24" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>;
}
function IconLock(p) {
  return <svg className="icon" viewBox="0 0 24 24" {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}

// ── Enterprise TLS/SSL Distribution ─────────────────────────
const TLS_VERSIONS = [
  { version: 'TLS 1.3', pct: 62, color: '#00e676', status: 'SECURE' },
  { version: 'TLS 1.2', pct: 31, color: '#448aff', status: 'SECURE' },
  { version: 'TLS 1.1', pct: 4,  color: '#f5a623', status: 'DEPRECATED' },
  { version: 'TLS 1.0', pct: 2,  color: '#ff3b3b', status: 'INSECURE' },
  { version: 'SSL 3.0', pct: 1,  color: '#ff3b3b', status: 'INSECURE' },
];

// ── Cipher Suite Distribution ───────────────────────────────
const CIPHER_SUITES = [
  { name: 'AES-256-GCM-SHA384',       pct: 38, strength: 'strong' },
  { name: 'AES-128-GCM-SHA256',       pct: 28, strength: 'strong' },
  { name: 'CHACHA20-POLY1305-SHA256', pct: 18, strength: 'strong' },
  { name: 'AES-256-CBC-SHA256',       pct: 8,  strength: 'moderate' },
  { name: 'AES-128-CBC-SHA',          pct: 5,  strength: 'weak' },
  { name: 'RC4-SHA',                   pct: 2,  strength: 'critical' },
  { name: 'DES-CBC3-SHA',             pct: 1,  strength: 'critical' },
];

// ── MITRE ATT&CK Threat Feed ────────────────────────────────
const THREAT_FEED_BASE = [
  { id: 'T1071.001', tactic: 'C2', technique: 'Application Layer Protocol: Web', severity: 'high',   src: '89.248.174.203', dst: '192.168.1.100', proto: 'HTTPS', detail: 'Encrypted C2 beacon detected — 30s interval, fixed payload size 1024B' },
  { id: 'T1110.001', tactic: 'Credential Access', technique: 'Brute Force: Password Guessing', severity: 'critical', src: '61.177.172.91', dst: '192.168.1.201', proto: 'SSH', detail: 'SSH brute-force — 847 failed auth attempts from CN in 5m window' },
  { id: 'T1046',     tactic: 'Discovery', technique: 'Network Service Scanning', severity: 'medium', src: '45.33.32.156', dst: '192.168.1.0/24', proto: 'TCP', detail: 'SYN scan across ports 21-8080 — 2,340 half-open connections' },
  { id: 'T1048.003', tactic: 'Exfiltration', technique: 'Exfil Over Unencrypted Protocol', severity: 'high', src: '192.168.1.45', dst: '195.154.181.22', proto: 'DNS', detail: 'DNS tunneling — base64 encoded payloads in TXT queries, avg 512B/query' },
  { id: 'T1190',     tactic: 'Initial Access', technique: 'Exploit Public-Facing Application', severity: 'critical', src: '185.220.101.45', dst: '192.168.1.200', proto: 'HTTP', detail: 'SQLi payload in GET /api/users?id=1 OR 1=1-- from Tor exit relay' },
  { id: 'T1071.004', tactic: 'C2', technique: 'Application Layer Protocol: DNS', severity: 'high', src: '192.168.1.67', dst: '89.248.174.203', proto: 'DNS', detail: 'High-entropy DNS queries — possible DGA domain generation (entropy: 4.82)' },
  { id: 'T1595.002', tactic: 'Recon', technique: 'Active Scanning: Vulnerability Scanning', severity: 'medium', src: '45.33.32.156', dst: '192.168.1.200', proto: 'HTTP', detail: 'Nmap service detection — HTTP headers fingerprinted, OS guess: Linux 5.x' },
  { id: 'T1557.002', tactic: 'Credential Access', technique: 'ARP Cache Poisoning', severity: 'critical', src: '192.168.1.254', dst: 'broadcast', proto: 'ARP', detail: 'Gratuitous ARP — MAC 00:11:22:33:44:55 claiming gateway 192.168.1.1' },
  { id: 'T1133',     tactic: 'Persistence', technique: 'External Remote Services', severity: 'medium', src: '195.154.181.22', dst: '192.168.1.201', proto: 'SSH', detail: 'SSH session from FR VPS — unusual geo for admin user "devops"' },
  { id: 'T1568.002', tactic: 'C2', technique: 'Dynamic Resolution: Domain Generation', severity: 'high', src: '192.168.1.30', dst: '8.8.8.8', proto: 'DNS', detail: 'DNS lookups for algorithmically-generated domains — 14 NXDOMAINs in 2 min' },
];

// ── Top Attackers ────────────────────────────────────────────
const TOP_ATTACKERS = [
  { ip: '61.177.172.91', country: 'CN', city: 'Shanghai', attacks: 847, type: 'Brute Force', risk: 98 },
  { ip: '89.248.174.203', country: 'RU', city: 'Moscow', attacks: 312, type: 'C2 Beacon', risk: 95 },
  { ip: '185.220.101.45', country: 'DE', city: 'Frankfurt', attacks: 156, type: 'Tor / SQLi', risk: 92 },
  { ip: '45.33.32.156', country: 'US', city: 'Fremont', attacks: 2340, type: 'Port Scanner', risk: 78 },
  { ip: '195.154.181.22', country: 'FR', city: 'Paris', attacks: 24, type: 'Suspicious VPS', risk: 65 },
  { ip: '103.224.80.11', country: 'VN', city: 'Hanoi', attacks: 67, type: 'HTTP Flood', risk: 72 },
];

// ── Protocol Security Matrix ────────────────────────────────
const PROTOCOL_MATRIX = [
  { proto: 'HTTPS/TLS 1.3', encryption: 'AES-256-GCM', auth: 'x509/PKI', integrity: 'SHA-384', pfs: true,  rating: 'A+' },
  { proto: 'HTTPS/TLS 1.2', encryption: 'AES-128-GCM', auth: 'x509/PKI', integrity: 'SHA-256', pfs: true,  rating: 'A' },
  { proto: 'SSH v2',        encryption: 'ChaCha20',     auth: 'Ed25519',  integrity: 'HMAC-SHA2', pfs: true,  rating: 'A' },
  { proto: 'DNS (Plain)',   encryption: 'None',          auth: 'None',     integrity: 'None',     pfs: false, rating: 'F' },
  { proto: 'DNS-over-HTTPS',encryption: 'AES-256-GCM',  auth: 'x509/PKI', integrity: 'SHA-384', pfs: true,  rating: 'A+' },
  { proto: 'HTTP (Plain)',  encryption: 'None',          auth: 'None',     integrity: 'None',     pfs: false, rating: 'F' },
  { proto: 'ICMP',          encryption: 'None',          auth: 'None',     integrity: 'Checksum', pfs: false, rating: 'D' },
  { proto: 'ARP',           encryption: 'None',          auth: 'None',     integrity: 'None',     pfs: false, rating: 'F' },
  { proto: 'NTP',           encryption: 'None',          auth: 'Symmetric',integrity: 'MD5',      pfs: false, rating: 'C' },
  { proto: 'SNMP v3',       encryption: 'AES-128',       auth: 'HMAC-SHA', integrity: 'SHA-1',   pfs: false, rating: 'B' },
];

// ── Threat Score Gauge (SVG Circular) ───────────────────────
function ThreatGauge({ score }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference * 0.75; // 270° arc
  const color = score > 70 ? '#ff3b3b' : score > 40 ? '#f5a623' : '#00e676';
  const label = score > 70 ? 'CRITICAL' : score > 40 ? 'ELEVATED' : 'NOMINAL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="200" height="170" viewBox="0 0 200 200">
        {/* Background arc */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="12" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round" transform="rotate(135 100 100)" />
        {/* Score arc */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke={color}
          strokeWidth="12" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={offset} strokeLinecap="round" transform="rotate(135 100 100)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease',
                   filter: `drop-shadow(0 0 8px ${color}40)` }} />
        {/* Score text */}
        <text x="100" y="92" textAnchor="middle" fill={color}
          fontFamily="var(--font-mono)" fontWeight="900" fontSize="42">{score}</text>
        <text x="100" y="112" textAnchor="middle" fill="var(--text-muted)"
          fontFamily="var(--font-mono)" fontWeight="700" fontSize="10"
          letterSpacing="0.15em">/100</text>
        <text x="100" y="140" textAnchor="middle" fill={color}
          fontFamily="var(--font-mono)" fontWeight="800" fontSize="11"
          letterSpacing="0.18em">{label}</text>
      </svg>
    </div>
  );
}

// ── Severity Badge ──────────────────────────────────────────
function SeverityBadge({ level }) {
  const colors = {
    critical: { bg: 'rgba(255,59,59,0.12)', fg: '#ff3b3b' },
    high:     { bg: 'rgba(245,166,35,0.12)', fg: '#f5a623' },
    medium:   { bg: 'rgba(68,138,255,0.12)', fg: '#448aff' },
    low:      { bg: 'rgba(0,230,118,0.12)', fg: '#00e676' },
  };
  const c = colors[level] || colors.medium;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 3,
      fontSize: '0.55rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.08em', background: c.bg, color: c.fg,
      textTransform: 'uppercase',
    }}>
      {level}
    </span>
  );
}


export default function ThreatIntel() {
  const [threatScore, setThreatScore] = useState(0);
  const [threats, setThreats] = useState([]);
  const [selectedTab, setSelectedTab] = useState('feed');
  const [tick, setTick] = useState(0);

  // Animate threat score on mount
  useEffect(() => {
    const target = 67; // Simulated composite score
    let current = 0;
    const step = () => {
      current += 2;
      if (current >= target) { setThreatScore(target); return; }
      setThreatScore(current);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  // Simulate live threat feed
  useEffect(() => {
    // Seed with initial threats
    const initial = THREAT_FEED_BASE.slice(0, 5).map((t, i) => ({
      ...t, _id: Date.now() + i, _ts: new Date(Date.now() - i * 30000),
    }));
    setThreats(initial);

    const timer = setInterval(() => {
      const entry = THREAT_FEED_BASE[Math.floor(Math.random() * THREAT_FEED_BASE.length)];
      setThreats(prev => [{
        ...entry, _id: Date.now() + Math.random(), _ts: new Date(),
      }, ...prev].slice(0, 20));
      setTick(t => t + 1);
    }, 4000 + Math.random() * 6000);

    return () => clearInterval(timer);
  }, []);

  // Fluctuate score slightly
  useEffect(() => {
    if (tick === 0) return;
    setThreatScore(prev => Math.min(99, Math.max(20, prev + Math.floor(Math.random() * 7 - 3))));
  }, [tick]);

  const ratingColor = r => {
    if (r === 'A+' || r === 'A') return '#00e676';
    if (r === 'B') return '#448aff';
    if (r === 'C') return '#f5a623';
    return '#ff3b3b';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><IconShieldCheck /></span>
            Threat Intelligence & DPI
          </h1>
          <p className="page-subtitle">Security posture analysis, deep packet inspection, and MITRE ATT&CK correlation</p>
        </div>
        <span className="card-badge live">● THREAT ENGINE ACTIVE</span>
      </div>

      {/* ── Top Section: Gauge + TLS + Ciphers ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>

        {/* Threat Score Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-header" style={{ width: '100%' }}>
            <span className="card-title" style={{ fontSize: '0.72rem' }}>Composite Threat Score</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)' }}>REAL-TIME</span>
          </div>
          <ThreatGauge score={threatScore} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', padding: '0 12px 8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>EVENTS/HR</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f5a623' }}>342</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>BLOCKED</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#00e676' }}>89%</div>
            </div>
          </div>
        </div>

        {/* TLS/SSL Version Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconLock style={{ width: 13, height: 13 }} /></span>TLS/SSL Version Distribution</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {TLS_VERSIONS.map(t => (
              <div key={t.version} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <span style={{ minWidth: 65, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {t.version}
                </span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${t.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ height: '100%', background: t.color, borderRadius: 4 }}
                  />
                </div>
                <span style={{ minWidth: 32, textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: t.color }}>
                  {t.pct}%
                </span>
                <span style={{
                  fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                  padding: '1px 5px', borderRadius: 2, letterSpacing: '0.06em',
                  background: t.status === 'SECURE' ? 'rgba(0,230,118,0.1)' : t.status === 'DEPRECATED' ? 'rgba(245,166,35,0.1)' : 'rgba(255,59,59,0.1)',
                  color: t.status === 'SECURE' ? '#00e676' : t.status === 'DEPRECATED' ? '#f5a623' : '#ff3b3b',
                }}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px 0 0', marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>TLS 1.2+ COVERAGE</span>
              <span style={{ color: '#00e676', fontWeight: 700 }}>93%</span>
            </div>
          </div>
        </div>

        {/* Cipher Suite Analysis */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Cipher Suite Distribution</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {CIPHER_SUITES.map(c => {
              const color = c.strength === 'strong' ? '#00e676' : c.strength === 'moderate' ? '#f5a623' : '#ff3b3b';
              return (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color, minWidth: 28, textAlign: 'right' }}>
                    {c.pct}%
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px 0 0', marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>STRONG CIPHER COVERAGE</span>
              <span style={{ color: '#00e676', fontWeight: 700 }}>84%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Section: Feed / Attackers / Matrix ──────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { key: 'feed',     label: 'THREAT FEED',       count: threats.length },
            { key: 'attackers',label: 'TOP ATTACKERS',     count: TOP_ATTACKERS.length },
            { key: 'matrix',   label: 'SECURITY MATRIX',  count: PROTOCOL_MATRIX.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                background: selectedTab === tab.key ? 'rgba(245,166,35,0.06)' : 'transparent',
                borderBottom: selectedTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: selectedTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '0.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '0.5rem', padding: '1px 5px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* THREAT FEED TAB */}
        {selectedTab === 'feed' && (
          <div style={{ maxHeight: 450, overflow: 'auto' }}>
            {threats.map((t, i) => (
              <motion.div
                key={t._id}
                initial={i === 0 ? { opacity: 0, y: -8 } : false}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  borderLeft: `3px solid ${t.severity === 'critical' ? '#ff3b3b' : t.severity === 'high' ? '#f5a623' : '#448aff'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SeverityBadge level={t.severity} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.technique}</span>
                  </div>
                  <span style={{
                    fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                    padding: '2px 6px', borderRadius: 3, background: 'rgba(245,166,35,0.08)', color: 'var(--accent)',
                  }}>
                    {t.id}
                  </span>
                </div>

                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                  {t.detail}
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  <span><span style={{ color: '#ff3b3b' }}>SRC</span> {t.src}</span>
                  <span><span style={{ color: '#00e676' }}>DST</span> {t.dst}</span>
                  <span><span style={{ color: '#448aff' }}>PROTO</span> {t.proto}</span>
                  <span><span style={{ color: '#b388ff' }}>TACTIC</span> {t.tactic}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                    {t._ts instanceof Date ? t._ts.toLocaleTimeString() : ''}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* TOP ATTACKERS TAB */}
        {selectedTab === 'attackers' && (
          <div className="data-table-container" style={{ maxHeight: 450, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>SOURCE IP</th>
                  <th>ORIGIN</th>
                  <th>ATTACK TYPE</th>
                  <th>EVENTS</th>
                  <th>RISK SCORE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {TOP_ATTACKERS.map((a, i) => {
                  const riskColor = a.risk > 90 ? '#ff3b3b' : a.risk > 70 ? '#f5a623' : '#448aff';
                  return (
                    <tr key={a.ip}>
                      <td style={{ fontWeight: 800, color: i < 3 ? '#ff3b3b' : 'var(--text-muted)' }}>#{i + 1}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{a.ip}</td>
                      <td>{a.city}, {a.country}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: 3, fontSize: '0.58rem', fontWeight: 700,
                          fontFamily: 'var(--font-mono)', background: 'rgba(255,59,59,0.08)', color: '#ff3b3b',
                        }}>
                          {a.type}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{a.attacks.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${a.risk}%`, height: '100%', background: riskColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.7rem', color: riskColor }}>{a.risk}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: 3, fontSize: '0.5rem', fontWeight: 800,
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                          background: 'rgba(255,59,59,0.1)', color: '#ff3b3b',
                        }}>
                          BLOCKED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PROTOCOL SECURITY MATRIX TAB */}
        {selectedTab === 'matrix' && (
          <div className="data-table-container" style={{ maxHeight: 450, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PROTOCOL</th>
                  <th>ENCRYPTION</th>
                  <th>AUTHENTICATION</th>
                  <th>INTEGRITY</th>
                  <th>PFS</th>
                  <th>RATING</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOL_MATRIX.map(p => (
                  <tr key={p.proto}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{p.proto}</td>
                    <td style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                      color: p.encryption === 'None' ? '#ff3b3b' : 'var(--text-primary)',
                    }}>
                      {p.encryption}
                    </td>
                    <td style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                      color: p.auth === 'None' ? '#ff3b3b' : 'var(--text-primary)',
                    }}>
                      {p.auth}
                    </td>
                    <td style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                      color: p.integrity === 'None' ? '#ff3b3b' : 'var(--text-primary)',
                    }}>
                      {p.integrity}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                        color: p.pfs ? '#00e676' : '#ff3b3b',
                      }}>
                        {p.pfs ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', width: 28, textAlign: 'center',
                        padding: '2px 0', borderRadius: 3, fontSize: '0.65rem', fontWeight: 900,
                        fontFamily: 'var(--font-mono)', color: ratingColor(p.rating),
                        background: `${ratingColor(p.rating)}15`,
                      }}>
                        {p.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

