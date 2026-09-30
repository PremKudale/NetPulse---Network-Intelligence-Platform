import { useState, useEffect, useRef } from 'react';

/* ================================================================
   LIVE PACKET CONSOLE
   ───────────────────
   Terminal-style scrolling log that shows simulated packet capture
   output in real-time. Each line represents a captured packet with
   timestamp, protocol badge, source → destination, size, and flags.
   
   Auto-scrolls to bottom. New lines appear with a subtle fade-in.
   The whole thing runs continuously to make the dashboard feel alive.
   ================================================================ */

const PROTOCOLS = ['TCP', 'UDP', 'DNS', 'HTTPS', 'HTTP', 'SSH', 'ICMP', 'ARP'];
const PROTOCOL_WEIGHTS = [40, 15, 18, 12, 5, 3, 4, 3];

const LOCAL_IPS = [
  '192.168.1.1', '192.168.1.10', '192.168.1.15', '192.168.1.22',
  '192.168.1.30', '192.168.1.45', '192.168.1.67', '192.168.1.100',
];

const EXTERNAL_IPS = [
  '142.250.190.46', '151.101.1.69', '104.16.132.229', '13.107.42.14',
  '52.94.236.248', '34.117.59.81', '172.67.188.45', '23.185.0.2',
];

const DNS_DOMAINS = [
  'google.com', 'github.com', 'stackoverflow.com', 'youtube.com',
  'cdn.jsdelivr.net', 'api.github.com', 'fonts.gstatic.com',
];

const TCP_FLAGS = ['SYN', 'SYN-ACK', 'ACK', 'PSH-ACK', 'FIN-ACK', 'RST'];

const PROTO_COLORS = {
  TCP:   '#448aff', UDP:   '#b388ff', DNS:   '#00e676',
  HTTPS: '#00e676', HTTP:  '#f5a623', SSH:   '#ff3b3b',
  ICMP:  '#18ffff', ARP:   '#f5a623',
};

function weightedPick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generatePacketLine() {
  const protocol = weightedPick(PROTOCOLS, PROTOCOL_WEIGHTS);
  const isOutbound = Math.random() > 0.35;
  const srcIp = isOutbound ? pick(LOCAL_IPS) : pick(EXTERNAL_IPS);
  const dstIp = isOutbound ? pick(EXTERNAL_IPS) : pick(LOCAL_IPS);

  let srcPort, dstPort, info = '', flags = null;

  switch (protocol) {
    case 'DNS':
      srcPort = isOutbound ? randInt(1024, 65535) : 53;
      dstPort = isOutbound ? 53 : randInt(1024, 65535);
      info = `Query: ${pick(DNS_DOMAINS)}`;
      break;
    case 'ICMP':
      srcPort = null;
      dstPort = null;
      info = pick(['Echo Request', 'Echo Reply', 'Dest Unreachable']);
      break;
    case 'ARP':
      srcPort = null;
      dstPort = null;
      info = `Who has ${dstIp}? Tell ${srcIp}`;
      break;
    case 'SSH':
      srcPort = isOutbound ? randInt(1024, 65535) : 22;
      dstPort = isOutbound ? 22 : randInt(1024, 65535);
      flags = pick(TCP_FLAGS);
      break;
    case 'HTTPS':
      srcPort = isOutbound ? randInt(1024, 65535) : 443;
      dstPort = isOutbound ? 443 : randInt(1024, 65535);
      flags = pick(TCP_FLAGS);
      break;
    case 'HTTP':
      srcPort = isOutbound ? randInt(1024, 65535) : 80;
      dstPort = isOutbound ? 80 : randInt(1024, 65535);
      flags = pick(TCP_FLAGS);
      break;
    default:
      srcPort = randInt(1024, 65535);
      dstPort = pick([80, 443, 8080, 3000, 5432, 3306, 25, 993]);
      flags = protocol === 'TCP' ? pick(TCP_FLAGS) : null;
  }

  const size = protocol === 'DNS' ? randInt(60, 512) :
               protocol === 'ICMP' ? 64 :
               protocol === 'ARP' ? 42 :
               randInt(52, 1500);

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

  return {
    id: Date.now() + Math.random(),
    timestamp: ts,
    protocol,
    srcIp,
    srcPort,
    dstIp,
    dstPort,
    size,
    flags,
    info,
  };
}


export default function PacketConsole({ maxLines = 40, speed = 'normal' }) {
  const [lines, setLines] = useState([]);
  const [paused, setPaused] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const scrollRef = useRef(null);
  const timerRef = useRef(null);

  // Auto-generate packet lines
  useEffect(() => {
    if (paused) return;

    const intervals = { slow: 600, normal: 280, fast: 80 };
    const ms = intervals[speed] || 280;

    // Seed with a few initial lines
    const initial = [];
    for (let i = 0; i < 8; i++) initial.push(generatePacketLine());
    setLines(initial);
    setPacketCount(initial.length);

    timerRef.current = setInterval(() => {
      const burstSize = Math.random() > 0.85 ? randInt(2, 4) : 1;
      const newLines = [];
      for (let i = 0; i < burstSize; i++) newLines.push(generatePacketLine());

      setLines(prev => {
        const updated = [...prev, ...newLines];
        return updated.slice(-maxLines);
      });
      setPacketCount(prev => prev + burstSize);
    }, ms + Math.random() * ms * 0.5);

    return () => clearInterval(timerRef.current);
  }, [paused, speed, maxLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const containerStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    lineHeight: 1.7,
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    fontSize: '0.58rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    flexShrink: 0,
  };

  const bodyStyle = {
    padding: '4px 0',
    overflow: 'auto',
    maxHeight: 240,
    scrollBehavior: 'smooth',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: paused ? 'var(--text-muted)' : 'var(--green)',
            boxShadow: paused ? 'none' : '0 0 6px rgba(0, 230, 118, 0.3)',
          }} />
          PACKET CAPTURE LOG
        </span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{packetCount} captured</span>
          <button
            onClick={() => setPaused(!paused)}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3, padding: '1px 6px', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.55rem', fontWeight: 700,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
            }}
          >
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
        </span>
      </div>

      <div ref={scrollRef} style={bodyStyle}>
        {lines.map((line, i) => (
          <div
            key={line.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '1px 10px',
              opacity: i >= lines.length - 3 ? 1 : 0.7,
              transition: 'opacity 0.3s',
            }}
          >
            {/* Line number */}
            <span style={{
              color: 'rgba(255,255,255,0.12)', minWidth: 24, textAlign: 'right',
              userSelect: 'none',
            }}>
              {String(i + 1).padStart(3, ' ')}
            </span>

            {/* Timestamp */}
            <span style={{ color: 'var(--text-muted)', minWidth: 78 }}>
              {line.timestamp}
            </span>

            {/* Protocol */}
            <span style={{
              color: PROTO_COLORS[line.protocol] || '#7c7c92',
              fontWeight: 700, minWidth: 40,
            }}>
              {line.protocol}
            </span>

            {/* Source → Destination */}
            <span style={{ color: '#7c7c92' }}>
              <span style={{ color: '#e2e2e8' }}>
                {line.srcIp}{line.srcPort ? `:${line.srcPort}` : ''}
              </span>
              <span style={{ color: 'var(--accent)', margin: '0 4px', fontWeight: 600 }}>→</span>
              <span style={{ color: '#e2e2e8' }}>
                {line.dstIp}{line.dstPort ? `:${line.dstPort}` : ''}
              </span>
            </span>

            {/* Size */}
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {line.size}B
            </span>

            {/* Flags or Info */}
            {line.flags && (
              <span style={{
                color: line.flags === 'SYN' ? '#f5a623' :
                       line.flags === 'RST' ? '#ff3b3b' :
                       line.flags === 'FIN-ACK' ? '#b388ff' : '#448aff',
                minWidth: 50,
              }}>
                [{line.flags}]
              </span>
            )}
            {line.info && !line.flags && (
              <span style={{ color: '#4a4a5e', minWidth: 50, fontSize: '0.62rem' }}>
                {line.info}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
