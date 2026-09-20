import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconActivity, IconLayers, IconDatabase, IconRadio, IconMonitor, IconShield, IconZap, IconTrendingUp, IconGlobe } from '../components/Icons';

const features = [
  {
    icon: IconRadio,
    title: 'Capture traffic',
    desc: 'Scapy-powered packet capture engine sniffing every frame on the wire — TCP, UDP, ICMP, DNS, ARP, and more.',
    color: 'var(--accent)',
  },
  {
    icon: IconZap,
    title: 'Analyze in real-time',
    desc: 'Per-packet protocol parsing, flow aggregation, and rolling statistics computed in-memory every 5 seconds.',
    color: 'var(--green)',
  },
  {
    icon: IconDatabase,
    title: 'Store & query',
    desc: 'SQLite persistence with WAL mode — zero setup. Historical bandwidth, per-device stats, and full packet logs.',
    color: 'var(--blue)',
  },
  {
    icon: IconTrendingUp,
    title: 'Visualize everything',
    desc: 'React dashboard with live charts, protocol distribution, traffic flows, device rankings, and anomaly alerts.',
    color: 'var(--purple)',
  },
];

const stats = [
  { label: 'Protocols Tracked', value: '8+', sub: 'TCP · UDP · DNS · ICMP · ARP · HTTP · HTTPS · SSH' },
  { label: 'Detection Algorithms', value: '4', sub: 'Bandwidth spikes · Port scans · Floods · Rare protocols' },
  { label: 'Dashboard Pages', value: '6', sub: 'Overview · Devices · Traffic · Protocols · Anomalies · Historical' },
  { label: 'Setup Time', value: '0 min', sub: 'SQLite auto-initializes · No database server needed' },
];

const techStack = [
  { layer: 'Capture Engine', tech: 'Python 3 + Scapy', detail: 'Multi-threaded packet sniffer with queue-based pipeline' },
  { layer: 'API Server', tech: 'Node.js + Express', detail: 'REST endpoints + Socket.IO real-time broadcasting' },
  { layer: 'Database', tech: 'SQLite (WAL)', detail: '7 tables · auto-schema · zero configuration' },
  { layer: 'Dashboard', tech: 'React + Vite', detail: 'Recharts · Framer Motion · WebSocket live updates' },
];

function IconGlobeLocal(props) {
  return <svg className="icon" viewBox="0 0 24 24" {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      {/* ── Hero Section ─────────────────────────────────── */}
      <section style={{
        position: 'relative', padding: '60px 32px 50px', overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(245,166,35,0.03) 0%, transparent 40%, rgba(68,138,255,0.02) 100%)',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,166,35,0.06) 1px, transparent 0)',
          backgroundSize: '40px 40px', pointerEvents: 'none', opacity: 0.5,
        }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{
              background: 'var(--accent)', color: 'var(--bg-primary)',
              padding: '3px 10px', borderRadius: 3, fontSize: '0.58rem',
              fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}>
              NETWORK INTELLIGENCE · CNT PROJECT
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            maxWidth: 700, marginBottom: 16,
          }}>
            See your network.<br />
            <span style={{ color: 'var(--accent)' }}>Understand</span> your network.
          </h1>

          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, maxWidth: 560, marginBottom: 32,
          }}>
            Turn raw network packets into actionable intelligence — real-time
            bandwidth monitoring, protocol analysis, device discovery, and
            automated anomaly detection. Fully offline, zero configuration.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.78rem', fontWeight: 800 }}
              onClick={() => navigate('/dashboard')}
            >
              OPEN DASHBOARD →
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: '10px 22px', fontSize: '0.78rem' }}
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              SEE HOW IT WORKS
            </button>
          </div>
        </motion.div>

        {/* Right side card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: 'absolute', right: 40, top: 50, width: 320,
            background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)', padding: 20, overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-bright))',
          }} />
          <div style={{
            fontSize: '0.55rem', fontWeight: 800, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
            fontFamily: 'var(--font-mono)',
          }}>
            REAL-TIME PIPELINE
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>
            Packet → Intelligence
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            Python captures raw packets. Node.js aggregates and stores.
            React visualizes. Every 5 seconds, automatically.
          </p>

          {/* Mini pipeline visualization */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {['CAPTURE', 'PARSE', 'AGGREGATE', 'STORE', 'BROADCAST', 'RENDER'].map((step, i) => (
              <span key={step} style={{
                flex: 1, textAlign: 'center', padding: '4px 0',
                fontSize: '0.46rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                background: i < 4 ? 'var(--accent-dim)' : 'var(--green-dim)',
                color: i < 4 ? 'var(--accent)' : 'var(--green)',
                borderRadius: 2,
              }}>
                {step}
              </span>
            ))}
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.68rem' }}
            onClick={() => navigate('/dashboard')}
          >
            INSPECT PIPELINE →
          </button>
        </motion.div>
      </section>

      {/* ── How It Works (Pipeline Steps) ────────────────── */}
      <section id="how-it-works" style={{ padding: '36px 32px' }}>
        <div style={{
          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 6,
        }}>
          HOW IT WORKS
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>
          Raw Packets → Network Intelligence
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              className="card"
              style={{ cursor: 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 5,
                  background: `${f.color}18`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: f.color,
                }}>
                  <f.icon style={{ width: 14, height: 14 }} />
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                  fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  STEP {i + 1}
                </span>
              </div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Stats Row ────────────────────────────────────── */}
      <section style={{
        padding: '28px 32px',
        background: 'linear-gradient(90deg, var(--accent-dim), transparent 50%)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
            >
              <div className="label" style={{ marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {s.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────────── */}
      <section style={{ padding: '36px 32px' }}>
        <div style={{
          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 6,
        }}>
          ARCHITECTURE
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>
          Four-Layer Stack
        </h2>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Technology</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {techStack.map((t, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{t.layer}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.tech}</td>
                  <td>{t.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 36px', fontSize: '0.85rem', fontWeight: 800 }}
            onClick={() => navigate('/dashboard')}
          >
            OPEN DASHBOARD →
          </button>
        </div>
      </section>
    </div>
  );
}
