import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getSocket } from '../../api/socket';

/* ================================================================
   LIVE PACKET CONSOLE — v2
   ─────────────────────────
   Terminal-style scrolling log with:
   • Real-time WebSocket feed (traffic:live) with mock fallback
   • Enterprise device hostname resolution
   • Service name mapping for well-known ports
   • TCP flag coloring (SYN=amber, RST=red, FIN=purple, ACK=blue)
   • Running PPS (packets per second) counter
   • Packet size histogram sparkline
   • Filter by protocol
   ================================================================ */

// ── Enterprise Device Hostname Map ──────────────────────────
const DEVICE_HOSTNAMES = {
  '192.168.1.1':   'gw-core-01',
  '192.168.1.10':  'ws-eng-01',
  '192.168.1.11':  'ws-eng-02',
  '192.168.1.15':  'ws-design-01',
  '192.168.1.22':  'ws-pm-01',
  '192.168.1.30':  'ws-qa-01',
  '192.168.1.45':  'ws-intern-01',
  '192.168.1.67':  'ws-finance-01',
  '192.168.1.100': 'mb-ceo-air',
  '192.168.1.101': 'mb-sales-01',
  '192.168.1.102': 'mb-dev-ipad',
  '192.168.1.200': 'srv-web-01',
  '192.168.1.201': 'srv-db-01',
  '192.168.1.202': 'srv-file-01',
  '192.168.1.203': 'srv-monitor',
  '192.168.1.150': 'iot-cam-lobby',
  '192.168.1.151': 'iot-cam-server',
  '192.168.1.160': 'iot-thermo-01',
  '192.168.1.170': 'iot-printer-01',
  '192.168.1.171': 'iot-badge-rdr',
};

// ── External Service Map ────────────────────────────────────
const EXTERNAL_SERVICES = {
  '142.250.192.46': 'google.com',     '142.250.80.46': 'gmail.com',
  '20.190.159.0': 'microsoft.com',    '13.107.42.14': 'teams.ms',
  '52.96.166.178': 'office365.com',   '151.101.1.140': 'github.com',
  '104.244.42.193': 'twitter.com',    '157.240.1.35': 'facebook.com',
  '44.238.134.70': 'zoom.us',         '23.32.238.122': 'aws.amazon.com',
  '8.8.8.8': 'dns.google',            '1.1.1.1': 'cloudflare-dns',
  '104.18.32.7': 'cloudflare.com',    '34.107.243.93': 'gcloud.google',
  '185.199.108.133': 'github-cdn',    '99.84.191.48': 'slack.com',
  '185.220.101.45': 'TOR-EXIT',       '45.33.32.156': 'SCANNER',
  '195.154.181.22': 'SUSP-VPS',       '89.248.174.203': 'BOTNET-C2',
  '61.177.172.91': 'CN-BRUTEFORCE',
};

// ── Port to Service Name ────────────────────────────────────
const PORT_SERVICES = {
  20: 'FTP-D', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  67: 'DHCP-S', 68: 'DHCP-C', 80: 'HTTP', 110: 'POP3', 143: 'IMAP',
  443: 'HTTPS', 993: 'IMAPS', 995: 'POP3S', 3306: 'MySQL', 3389: 'RDP',
  5432: 'PgSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt',
  27017: 'MongoDB', 9200: 'ElasticSearch',
};

const PROTOCOLS = ['TCP', 'UDP', 'DNS', 'HTTPS', 'HTTP', 'SSH', 'ICMP', 'ARP', 'DHCP', 'NTP', 'mDNS', 'SNMP'];
const PROTOCOL_WEIGHTS = [14, 8, 5, 55, 3, 3, 2, 1, 1, 2, 3, 3];

const LOCAL_IPS = Object.keys(DEVICE_HOSTNAMES);
const EXTERNAL_IPS = Object.keys(EXTERNAL_SERVICES);

const DNS_DOMAINS = [
  'google.com', 'github.com', 'stackoverflow.com', 'youtube.com',
  'cdn.jsdelivr.net', 'api.github.com', 'fonts.gstatic.com',
  'slack.com', 'zoom.us', 'teams.microsoft.com', 'npmjs.com',
  'registry.npmjs.org', 'pypi.org', 'docker.io',
];

const TCP_FLAGS = ['SYN', 'SYN-ACK', 'ACK', 'PSH-ACK', 'FIN-ACK', 'RST', 'RST-ACK'];

const PROTO_COLORS = {
  TCP: '#448aff', UDP: '#b388ff', DNS: '#00e676', HTTPS: '#00e676',
  HTTP: '#f5a623', SSH: '#ff3b3b', ICMP: '#18ffff', ARP: '#f5a623',
  DHCP: '#b388ff', NTP: '#7c7c92', mDNS: '#18ffff', SNMP: '#f5a623',
  IGMP: '#7c7c92', Syslog: '#b388ff',
};

const FLAG_COLORS = {
  'SYN': '#f5a623', 'SYN-ACK': '#f5a623', 'ACK': '#448aff',
  'PSH-ACK': '#448aff', 'FIN-ACK': '#b388ff', 'RST': '#ff3b3b', 'RST-ACK': '#ff3b3b',
};

function weightedPick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function resolveIp(ip) {
  return DEVICE_HOSTNAMES[ip] || EXTERNAL_SERVICES[ip] || ip;
}

function resolvePort(port) {
  return PORT_SERVICES[port] || null;
}

function generatePacketLine() {
  const protocol = weightedPick(PROTOCOLS, PROTOCOL_WEIGHTS);
  const isInternal = ['ARP', 'DHCP', 'mDNS', 'IGMP', 'SNMP', 'NTP'].includes(protocol);
  const isOutbound = isInternal ? true : Math.random() > 0.35;
  const srcIp = isOutbound ? pick(LOCAL_IPS) : (isInternal ? pick(LOCAL_IPS) : pick(EXTERNAL_IPS));
  const dstIp = isOutbound ? (isInternal ? pick(LOCAL_IPS) : pick(EXTERNAL_IPS)) : pick(LOCAL_IPS);

  let srcPort, dstPort, info = '', flags = null;

  switch (protocol) {
    case 'DNS': case 'mDNS':
      srcPort = isOutbound ? randInt(49152, 65535) : (protocol === 'mDNS' ? 5353 : 53);
      dstPort = isOutbound ? (protocol === 'mDNS' ? 5353 : 53) : randInt(49152, 65535);
      info = `Query: ${pick(DNS_DOMAINS)} ${pick(['A', 'AAAA', 'MX', 'TXT', 'CNAME'])}`;
      break;
    case 'ICMP':
      srcPort = null; dstPort = null;
      info = pick(['Echo Request seq=1', 'Echo Reply seq=1', 'Dest Unreachable (Port)', 'TTL Expired in Transit', 'Echo Request seq=2']);
      break;
    case 'ARP':
      srcPort = null; dstPort = null;
      info = pick([`Who has ${dstIp}? Tell ${srcIp}`, `${srcIp} is at ${pick(['AA:BB:CC', 'DE:AD:BE', '00:1A:2B'])}:${randInt(10,99)}:${randInt(10,99)}:${randInt(10,99)}`]);
      break;
    case 'DHCP':
      srcPort = 68; dstPort = 67;
      info = pick(['DHCPDISCOVER', 'DHCPOFFER', 'DHCPREQUEST', 'DHCPACK']);
      break;
    case 'NTP':
      srcPort = randInt(49152, 65535); dstPort = 123;
      info = pick(['Client Request v4', 'Server Response stratum=2', 'NTP Sync offset=-0.003s']);
      break;
    case 'SNMP':
      srcPort = randInt(49152, 65535); dstPort = 161;
      info = pick(['GET sysUpTime.0', 'GET-NEXT ifInOctets', 'TRAP linkDown', 'SET sysContact']);
      break;
    case 'SSH':
      srcPort = isOutbound ? randInt(49152, 65535) : 22;
      dstPort = isOutbound ? 22 : randInt(49152, 65535);
      flags = pick(TCP_FLAGS);
      info = pick(['', 'Key Exchange Init', 'New Keys', 'Encrypted packet len=128']);
      break;
    case 'HTTPS':
      srcPort = isOutbound ? randInt(49152, 65535) : 443;
      dstPort = isOutbound ? 443 : randInt(49152, 65535);
      flags = pick(TCP_FLAGS);
      break;
    case 'HTTP':
      srcPort = isOutbound ? randInt(49152, 65535) : 80;
      dstPort = isOutbound ? 80 : randInt(49152, 65535);
      flags = pick(TCP_FLAGS);
      info = pick(['', 'GET /api/health', 'POST /api/data', '200 OK', '301 Moved']);
      break;
    default:
      srcPort = randInt(49152, 65535);
      dstPort = pick([80, 443, 8080, 3000, 5432, 3306, 25, 993]);
      flags = protocol === 'TCP' ? pick(TCP_FLAGS) : null;
  }

  // Realistic bimodal sizes
  const size = protocol === 'DNS' ? randInt(60, 512) :
               protocol === 'ICMP' ? 64 :
               protocol === 'ARP' ? 42 :
               protocol === 'DHCP' ? randInt(300, 576) :
               protocol === 'NTP' ? 90 :
               Math.random() > 0.6 ? randInt(40, 128) : randInt(512, 1460);

  const ttl = LOCAL_IPS.includes(srcIp) && LOCAL_IPS.includes(dstIp)
    ? pick([64, 128])
    : pick([48, 52, 56, 60, 64, 112, 118, 124, 128]);

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

  return { id: Date.now() + Math.random(), timestamp: ts, protocol, srcIp, srcPort, dstIp, dstPort, size, flags, info, ttl };
}


export default function PacketConsole({ maxLines = 50, speed = 'normal' }) {
  const [lines, setLines] = useState([]);
  const [paused, setPaused] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [pps, setPps] = useState(0);
  const [filterProto, setFilterProto] = useState('ALL');
  const [showHostnames, setShowHostnames] = useState(true);
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const ppsCounter = useRef(0);
  const socketConnected = useRef(false);

  // Try WebSocket, fallback to mock
  useEffect(() => {
    if (paused) return;

    let socket;
    try {
      socket = getSocket();
      if (socket && socket.connected) {
        socketConnected.current = true;
      }
      socket.on('traffic:live', (payload) => {
        if (!payload) return;
        const packets = Array.isArray(payload) ? payload : (payload.recent_packets || []);
        if (packets.length === 0) return;
        socketConnected.current = true;

        const mapped = packets.map(p => ({
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 }),
          protocol: (p.protocol || 'TCP').toUpperCase(),
          srcIp: p.src_ip || p.source || '0.0.0.0',
          srcPort: p.src_port || p.source_port || null,
          dstIp: p.dst_ip || p.destination || '0.0.0.0',
          dstPort: p.dst_port || p.dest_port || null,
          size: p.size || p.length || 0,
          flags: p.tcp_flags || p.flags || null,
          info: p.info || '',
          ttl: p.ttl || 64,
        }));

        setLines(prev => [...prev, ...mapped].slice(-maxLines));
        setPacketCount(prev => prev + mapped.length);
        ppsCounter.current += mapped.length;
      });
    } catch (e) {
      // Socket not available
    }

    // Fallback: generate mock packets if no live data after 3s
    const fallbackTimer = setTimeout(() => {
      if (socketConnected.current) return;

      const intervals = { slow: 600, normal: 200, fast: 60 };
      const ms = intervals[speed] || 200;

      const initial = [];
      for (let i = 0; i < 10; i++) initial.push(generatePacketLine());
      setLines(initial);
      setPacketCount(initial.length);
      ppsCounter.current = initial.length;

      timerRef.current = setInterval(() => {
        const burstSize = Math.random() > 0.82 ? randInt(2, 5) : 1;
        const newLines = [];
        for (let i = 0; i < burstSize; i++) newLines.push(generatePacketLine());

        setLines(prev => [...prev, ...newLines].slice(-maxLines));
        setPacketCount(prev => prev + burstSize);
        ppsCounter.current += burstSize;
      }, ms + Math.random() * ms * 0.4);
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      clearInterval(timerRef.current);
      if (socket) socket.off('traffic:live');
    };
  }, [paused, speed, maxLines]);

  // PPS meter
  useEffect(() => {
    const meter = setInterval(() => {
      setPps(ppsCounter.current);
      ppsCounter.current = 0;
    }, 1000);
    return () => clearInterval(meter);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const filteredLines = useMemo(() =>
    filterProto === 'ALL' ? lines : lines.filter(l => l.protocol === filterProto),
    [lines, filterProto]
  );

  const protoCounts = useMemo(() => {
    const counts = {};
    lines.forEach(l => { counts[l.protocol] = (counts[l.protocol] || 0) + 1; });
    return counts;
  }, [lines]);

  const formatAddr = useCallback((ip, port) => {
    const name = showHostnames ? resolveIp(ip) : ip;
    const svc = port ? resolvePort(port) : null;
    const portStr = port ? (svc ? `:${port}(${svc})` : `:${port}`) : '';
    return { name, portStr, isThreat: EXTERNAL_SERVICES[ip] && ['TOR-EXIT','SCANNER','SUSP-VPS','BOTNET-C2','CN-BRUTEFORCE'].includes(EXTERNAL_SERVICES[ip]) };
  }, [showHostnames]);

  const containerStyle = {
    fontFamily: 'var(--font-mono)', fontSize: '0.66rem', lineHeight: 1.65,
    background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column',
  };

  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    padding: '6px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    fontSize: '0.56rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)', flexShrink: 0, gap: 6,
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: paused ? 'var(--text-muted)' : '#00e676',
            boxShadow: paused ? 'none' : '0 0 6px rgba(0, 230, 118, 0.4)',
          }} />
          PACKET CAPTURE LOG
          {socketConnected.current && (
            <span style={{
              fontSize: '0.45rem', padding: '1px 4px', borderRadius: 2,
              background: 'rgba(0,230,118,0.1)', color: '#00e676', fontWeight: 800,
            }}>LIVE</span>
          )}
        </span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* PPS Counter */}
          <span style={{ color: '#18ffff', fontWeight: 700, fontSize: '0.6rem' }}>
            {pps} pps
          </span>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{packetCount.toLocaleString()} captured</span>

          {/* Hostname toggle */}
          <button onClick={() => setShowHostnames(!showHostnames)} title="Toggle hostname resolution"
            style={{
              background: showHostnames ? 'rgba(0,230,118,0.1)' : 'none',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3,
              padding: '1px 5px', cursor: 'pointer', color: showHostnames ? '#00e676' : 'var(--text-muted)',
              fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
            }}>
            DNS
          </button>

          {/* Protocol filter */}
          <select
            value={filterProto}
            onChange={e => setFilterProto(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3, padding: '1px 4px', color: 'var(--text-muted)',
              fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            <option value="ALL">ALL</option>
            {Object.keys(protoCounts).sort().map(p => (
              <option key={p} value={p}>{p} ({protoCounts[p]})</option>
            ))}
          </select>

          <button onClick={() => setPaused(!paused)}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3, padding: '1px 6px', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.52rem', fontWeight: 700,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
            }}>
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
        </span>
      </div>

      {/* Packet lines */}
      <div ref={scrollRef} style={{ padding: '4px 0', overflow: 'auto', maxHeight: 280, scrollBehavior: 'smooth' }}>
        {filteredLines.map((line, i) => {
          const src = formatAddr(line.srcIp, line.srcPort);
          const dst = formatAddr(line.dstIp, line.dstPort);
          return (
            <div key={line.id} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '1px 10px',
              opacity: i >= filteredLines.length - 3 ? 1 : 0.7, transition: 'opacity 0.3s',
              background: (src.isThreat || dst.isThreat) ? 'rgba(255,59,59,0.04)' : 'transparent',
            }}>
              {/* Line number */}
              <span style={{ color: 'rgba(255,255,255,0.1)', minWidth: 26, textAlign: 'right', userSelect: 'none', fontSize: '0.58rem' }}>
                {String(i + 1).padStart(3, ' ')}
              </span>

              {/* Timestamp */}
              <span style={{ color: 'var(--text-muted)', minWidth: 74, fontSize: '0.62rem' }}>
                {line.timestamp}
              </span>

              {/* Protocol badge */}
              <span style={{
                color: PROTO_COLORS[line.protocol] || '#7c7c92',
                fontWeight: 800, minWidth: 38, fontSize: '0.62rem',
              }}>
                {line.protocol}
              </span>

              {/* Source → Destination */}
              <span style={{ color: '#7c7c92', display: 'flex', alignItems: 'center', gap: 0, flex: 1, overflow: 'hidden' }}>
                <span style={{
                  color: src.isThreat ? '#ff3b3b' : '#e2e2e8',
                  fontWeight: src.isThreat ? 700 : 400, whiteSpace: 'nowrap',
                }}>
                  {src.name}<span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>{src.portStr}</span>
                </span>
                <span style={{ color: 'var(--accent)', margin: '0 4px', fontWeight: 700, flexShrink: 0 }}>→</span>
                <span style={{
                  color: dst.isThreat ? '#ff3b3b' : '#e2e2e8',
                  fontWeight: dst.isThreat ? 700 : 400, whiteSpace: 'nowrap',
                }}>
                  {dst.name}<span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>{dst.portStr}</span>
                </span>
              </span>

              {/* TTL */}
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.55rem', minWidth: 30, textAlign: 'right' }}>
                TTL {line.ttl}
              </span>

              {/* Size */}
              <span style={{ color: 'var(--text-muted)', minWidth: 40, textAlign: 'right', fontSize: '0.62rem' }}>
                {line.size}B
              </span>

              {/* Flags or Info */}
              {line.flags && (
                <span style={{
                  color: FLAG_COLORS[line.flags] || '#448aff',
                  minWidth: 55, fontWeight: 700, fontSize: '0.58rem',
                }}>
                  [{line.flags}]
                </span>
              )}
              {line.info && !line.flags && (
                <span style={{ color: '#4a4a5e', minWidth: 55, fontSize: '0.58rem' }}>
                  {line.info}
                </span>
              )}
              {!line.flags && !line.info && <span style={{ minWidth: 55 }} />}
            </div>
          );
        })}
      </div>

      {/* Footer: Protocol mini-bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '3px 10px', flexShrink: 0, overflow: 'hidden',
      }}>
        {Object.entries(protoCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([proto, count]) => {
          const pct = lines.length > 0 ? (count / lines.length) * 100 : 0;
          return (
            <div key={proto} style={{
              flex: pct, height: 3, background: PROTO_COLORS[proto] || '#7c7c92',
              opacity: 0.5, minWidth: pct > 1 ? 2 : 0,
              transition: 'flex 0.3s',
            }}
            title={`${proto}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
    </div>
  );
}
