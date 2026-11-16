import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

/* ================================================================
   GEOIP THREAT MAP
   Interactive SVG world map showing live connections from the
   enterprise network to external endpoints with animated arcs.
   ================================================================ */

// ── Enterprise origin (Pune, India) ────────────────────────
const ORIGIN = { lat: 18.52, lng: 73.86, label: 'NetPulse HQ — Pune, India' };

// ── Known external endpoints with GeoIP data ───────────────
const GEO_ENDPOINTS = [
  { ip: '142.250.192.46', name: 'Google',         city: 'Mountain View',lat: 37.39, lng: -122.08, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '142.250.80.46',  name: 'Gmail',          city: 'Mountain View',lat: 37.39, lng: -122.08, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '20.190.159.0',   name: 'Microsoft 365',  city: 'Redmond',      lat: 47.68, lng: -122.12, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '13.107.42.14',   name: 'MS Teams',       city: 'Redmond',      lat: 47.68, lng: -122.12, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '52.96.166.178',  name: 'Office 365',     city: 'Chicago',      lat: 41.88, lng: -87.63,  country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '151.101.1.140',  name: 'GitHub',          city: 'San Francisco',lat: 37.77, lng: -122.42, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '104.244.42.193', name: 'Twitter/X',       city: 'San Francisco',lat: 37.77, lng: -122.42, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '157.240.1.35',   name: 'Facebook',        city: 'Menlo Park',   lat: 37.45, lng: -122.18, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '44.238.134.70',  name: 'Zoom',            city: 'Portland',     lat: 45.52, lng: -122.68, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '23.32.238.122',  name: 'AWS',             city: 'Seattle',      lat: 47.61, lng: -122.33, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '8.8.8.8',        name: 'Google DNS',      city: 'Ashburn',      lat: 39.04, lng: -77.49,  country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '1.1.1.1',        name: 'Cloudflare DNS',  city: 'Sydney',       lat: -33.87,lng: 151.21,  country: 'AU', flag: '🇦🇺', threat: 'safe' },
  { ip: '104.18.32.7',    name: 'Cloudflare',      city: 'San Francisco',lat: 37.77, lng: -122.42, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '34.107.243.93',  name: 'Google Cloud',    city: 'The Dalles',   lat: 45.60, lng: -121.18, country: 'US', flag: '🇺🇸', threat: 'safe' },
  { ip: '185.199.108.133',name: 'GitHub CDN',      city: 'Amsterdam',    lat: 52.37, lng: 4.90,    country: 'NL', flag: '🇳🇱', threat: 'safe' },
  { ip: '99.84.191.48',   name: 'Slack',           city: 'San Jose',     lat: 37.34, lng: -121.89, country: 'US', flag: '🇺🇸', threat: 'safe' },
  // Simulated threat actors
  { ip: '185.220.101.45', name: 'Tor Exit Node',   city: 'Frankfurt',    lat: 50.11, lng: 8.68,    country: 'DE', flag: '🇩🇪', threat: 'critical' },
  { ip: '45.33.32.156',   name: 'Scanner Host',    city: 'Fremont',      lat: 37.55, lng: -122.05, country: 'US', flag: '🇺🇸', threat: 'warning' },
  { ip: '195.154.181.22', name: 'Suspicious VPS',  city: 'Paris',        lat: 48.86, lng: 2.35,    country: 'FR', flag: '🇫🇷', threat: 'warning' },
  { ip: '89.248.174.203', name: 'Botnet C2',       city: 'Moscow',       lat: 55.76, lng: 37.62,   country: 'RU', flag: '🇷🇺', threat: 'critical' },
  { ip: '61.177.172.91',  name: 'Brute Force Src', city: 'Shanghai',     lat: 31.23, lng: 121.47,  country: 'CN', flag: '🇨🇳', threat: 'critical' },
];

// ── Simplified SVG world map paths ─────────────────────────
const CONTINENTS = `M 115,55 L 125,42 135,38 148,42 155,50 160,45 175,42 185,48 178,55 170,52 165,58 160,55 150,60 140,58 135,62 125,60 Z
M 260,35 L 275,28 290,30 310,28 330,32 350,30 370,35 385,32 400,30 420,35 440,38 460,42 480,38 500,42 510,48 520,52 530,45 540,50 530,60 520,65 530,72 540,80 550,85 555,92 550,100 540,98 520,102 500,98 490,105 480,110 460,108 440,115 420,110 400,115 390,108 380,112 370,105 360,110 350,115 340,118 330,120 320,115 310,110 300,108 290,115 280,110 270,105 260,100 255,90 258,80 255,72 260,65 268,58 265,48 Z
M 190,62 L 200,55 215,52 230,55 245,50 260,55 268,58 260,65 255,72 258,80 255,90 248,95 240,92 235,85 228,90 220,92 215,88 210,80 205,75 200,72 195,68 Z
M 135,100 L 145,95 155,98 165,95 170,100 175,105 180,112 175,120 170,128 165,135 158,140 152,148 145,158 140,165 138,170 132,168 128,160 125,150 128,142 130,135 128,128 132,120 130,112 Z
M 475,120 L 490,112 505,115 515,120 520,128 518,138 510,145 498,148 488,142 480,132 Z
M 505,155 L 520,148 540,150 555,155 565,165 560,178 548,185 535,182 520,175 512,165 Z`;

// Mercator projection
function project(lat, lng, width = 700, height = 400) {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN * width) / (2 * Math.PI);
  return { x, y: Math.max(10, Math.min(height - 10, y)) };
}

// Curved path between two points
function arcPath(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curve = dist * 0.3;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - curve;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

function IconGlobe(p) {
  return <svg className="icon" viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
}

export default function GeoMap() {
  const W = 700, H = 400;
  const originPt = project(ORIGIN.lat, ORIGIN.lng, W, H);
  const [activeConnections, setActiveConnections] = useState([]);
  const [connectionLog, setConnectionLog] = useState([]);
  const [tick, setTick] = useState(0);

  // Animate connections in/out
  useEffect(() => {
    function addConnection() {
      const endpoint = GEO_ENDPOINTS[Math.floor(Math.random() * GEO_ENDPOINTS.length)];
      const pt = project(endpoint.lat, endpoint.lng, W, H);
      const id = Date.now() + Math.random();
      const latency = endpoint.threat === 'safe'
        ? Math.round(30 + Math.random() * 200)
        : Math.round(150 + Math.random() * 400);
      const conn = { ...endpoint, id, pt, latency, ts: new Date(), progress: 0 };

      setActiveConnections(prev => [...prev.slice(-12), conn]);
      setConnectionLog(prev => [conn, ...prev].slice(0, 25));
    }

    addConnection();
    addConnection();
    addConnection();

    const timer = setInterval(() => {
      addConnection();
      setTick(t => t + 1);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(timer);
  }, []);

  // Animate arcs
  useEffect(() => {
    const anim = setInterval(() => {
      setActiveConnections(prev =>
        prev.map(c => ({ ...c, progress: Math.min(1, c.progress + 0.08) }))
            .filter(c => c.progress < 1 || Date.now() - c.ts.getTime() < 8000)
      );
    }, 60);
    return () => clearInterval(anim);
  }, []);

  const countries = useMemo(() => {
    const set = new Set(activeConnections.map(c => c.country));
    return set.size || 1;
  }, [activeConnections]);

  const threats = activeConnections.filter(c => c.threat !== 'safe');
  const avgLatency = activeConnections.length > 0
    ? Math.round(activeConnections.reduce((s, c) => s + c.latency, 0) / activeConnections.length)
    : 0;

  const threatColor = threats.length > 2 ? '#ff3b3b' : threats.length > 0 ? '#f5a623' : '#00e676';
  const threatLabel = threats.length > 2 ? 'ELEVATED' : threats.length > 0 ? 'GUARDED' : 'NOMINAL';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconGlobe /></span>GeoIP Threat Map</h1>
          <p className="page-subtitle">Live connection geolocation and threat visualization</p>
        </div>
        <span className="card-badge live">● LIVE TRACKING</span>
      </div>

      {/* Stats Row */}
      <div className="stats-grid stagger-children">
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Active Connections</span></div>
          <div className="stat-card-value">{activeConnections.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Countries Reached</span></div>
          <div className="stat-card-value">{countries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Avg Latency</span></div>
          <div className="stat-card-value">{avgLatency}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 3 }}>ms</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Threat Level</span></div>
          <div className="stat-card-value" style={{ color: threatColor, fontSize: '1.1rem' }}>{threatLabel}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '10px 16px' }}>
            <span className="card-title"><span className="card-title-icon"><IconGlobe style={{ width: 14, height: 14 }} /></span>Global Connection Map</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>MERCATOR PROJECTION</span>
          </div>
          <div style={{ position: 'relative', background: 'rgba(0,0,0,0.4)' }}>
            {/* Grid overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }} />
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
              <defs>
                <radialGradient id="origin-glow">
                  <stop offset="0%" stopColor="#00e676" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#00e676" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="threat-glow">
                  <stop offset="0%" stopColor="#ff3b3b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Continents */}
              {CONTINENTS.split('\n').map((d, i) => (
                <path key={i} d={d.trim()} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              ))}

              {/* Connection arcs */}
              {activeConnections.map(conn => {
                const path = arcPath(originPt, conn.pt);
                const color = conn.threat === 'critical' ? '#ff3b3b' : conn.threat === 'warning' ? '#f5a623' : '#448aff';
                return (
                  <g key={conn.id}>
                    <path d={path} fill="none" stroke={color} strokeWidth="1" opacity={0.15} />
                    <path d={path} fill="none" stroke={color} strokeWidth="1.5" opacity={0.8}
                      strokeDasharray="8 4"
                      style={{ animation: 'dash 2s linear infinite' }}
                    />
                    {/* Endpoint dot */}
                    <circle cx={conn.pt.x} cy={conn.pt.y} r="6" fill={color} opacity="0.15" />
                    <circle cx={conn.pt.x} cy={conn.pt.y} r="3" fill={color} opacity="0.9" filter="url(#glow)" />
                  </g>
                );
              })}

              {/* Origin pulse */}
              <circle cx={originPt.x} cy={originPt.y} r="16" fill="url(#origin-glow)">
                <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={originPt.x} cy={originPt.y} r="4" fill="#00e676" filter="url(#glow)" />
              <text x={originPt.x + 8} y={originPt.y - 8} fill="#00e676" fontSize="7" fontFamily="var(--font-mono)" fontWeight="600">NETPULSE HQ</text>
            </svg>

            <style>{`@keyframes dash { to { stroke-dashoffset: -24; } }`}</style>
          </div>
        </div>

        {/* Connection Log Sidebar */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '10px 14px', flexShrink: 0 }}>
            <span className="card-title" style={{ fontSize: '0.72rem' }}>Active Connections</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--green)' }}>{connectionLog.length} tracked</span>
          </div>
          <div style={{ overflow: 'auto', flex: 1, maxHeight: 420 }}>
            {connectionLog.map((conn, i) => {
              const color = conn.threat === 'critical' ? '#ff3b3b' : conn.threat === 'warning' ? '#f5a623' : '#448aff';
              const ts = conn.ts instanceof Date ? conn.ts : new Date(conn.ts);
              return (
                <motion.div
                  key={conn.id}
                  initial={i === 0 ? { opacity: 0, x: 10 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: '0.68rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ color, marginRight: 6 }}>●</span>{conn.name}
                    </span>
                    <span style={{
                      fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      padding: '1px 5px', borderRadius: 2,
                      background: conn.threat === 'safe' ? 'rgba(0,230,118,0.1)' : conn.threat === 'warning' ? 'rgba(245,166,35,0.1)' : 'rgba(255,59,59,0.1)',
                      color: conn.threat === 'safe' ? '#00e676' : conn.threat === 'warning' ? '#f5a623' : '#ff3b3b',
                    }}>
                      {conn.threat === 'safe' ? 'SAFE' : conn.threat.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>
                    <span>{conn.flag} {conn.city}, {conn.country}</span>
                    <span>{conn.latency}ms</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', marginTop: 2 }}>
                    {conn.ip} · {ts.toLocaleTimeString()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

