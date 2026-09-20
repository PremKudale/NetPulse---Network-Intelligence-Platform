/**
 * NetPulse — Realistic Mock Data Generator
 * Generates deterministic but realistic-looking network data
 * so the dashboard is always populated and impressive.
 */

// ── Seed-based deterministic random ────────────────────────
let seed = 42;
function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randInt(min, max) { return Math.floor(seededRandom() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(seededRandom() * arr.length)]; }

// ── Network Constants ──────────────────────────────────────
const LOCAL_IPS = [
  '192.168.1.1', '192.168.1.10', '192.168.1.15', '192.168.1.22',
  '192.168.1.30', '192.168.1.45', '192.168.1.67', '192.168.1.100',
  '192.168.1.110', '192.168.1.150', '10.0.0.1', '10.0.0.5',
];

const EXTERNAL_IPS = [
  '142.250.190.46', '151.101.1.69', '104.16.132.229', '13.107.42.14',
  '52.94.236.248', '34.117.59.81', '172.67.188.45', '23.185.0.2',
  '198.35.26.96', '185.125.190.56', '216.58.214.206', '31.13.72.36',
];

const PROTOCOLS = ['TCP', 'UDP', 'DNS', 'HTTPS', 'HTTP', 'SSH', 'ICMP', 'ARP'];
const PROTOCOL_WEIGHTS = [35, 18, 15, 14, 8, 4, 3, 3];

const PORT_SERVICES = [
  { port: 443, protocol: 'TCP', service: 'HTTPS' },
  { port: 80, protocol: 'TCP', service: 'HTTP' },
  { port: 53, protocol: 'UDP', service: 'DNS' },
  { port: 22, protocol: 'TCP', service: 'SSH' },
  { port: 8080, protocol: 'TCP', service: 'HTTP-ALT' },
  { port: 3306, protocol: 'TCP', service: 'MySQL' },
  { port: 5432, protocol: 'TCP', service: 'PostgreSQL' },
  { port: 25, protocol: 'TCP', service: 'SMTP' },
  { port: 993, protocol: 'TCP', service: 'IMAPS' },
  { port: 3389, protocol: 'TCP', service: 'RDP' },
  { port: 445, protocol: 'TCP', service: 'SMB' },
  { port: 67, protocol: 'UDP', service: 'DHCP' },
];

function weightedPick(items, weights) {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let r = seededRandom() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── Generators ─────────────────────────────────────────────

export function generateBandwidthHistory(points = 60) {
  const data = [];
  const now = Date.now();
  let baseBps = 12000000; // ~12 MB/s base
  let basePps = 8500;

  for (let i = points; i >= 0; i--) {
    const time = new Date(now - i * 5000).toISOString();
    // Simulate realistic variance with occasional spikes
    const spike = seededRandom() > 0.92 ? randInt(2, 4) : 1;
    const noise = 0.7 + seededRandom() * 0.6;
    const dailyCycle = 0.8 + 0.4 * Math.sin((i / points) * Math.PI * 2);

    data.push({
      time,
      timestamp: time,
      bytes_per_sec: Math.round(baseBps * noise * dailyCycle * spike),
      packets_per_sec: Math.round(basePps * noise * dailyCycle * spike),
      active_devices: randInt(6, 12),
    });
  }
  return data;
}

export function generateProtocols() {
  const totalBytes = 485000000; // ~485 MB total
  return PROTOCOLS.map((protocol, i) => {
    const share = PROTOCOL_WEIGHTS[i] / 100;
    const byteCount = Math.round(totalBytes * share * (0.8 + seededRandom() * 0.4));
    const avgPacketSize = protocol === 'DNS' ? 120 : protocol === 'ICMP' ? 64 : protocol === 'ARP' ? 42 : randInt(200, 1400);
    return {
      protocol,
      byte_count: byteCount,
      packet_count: Math.round(byteCount / avgPacketSize),
    };
  }).sort((a, b) => b.byte_count - a.byte_count);
}

export function generatePorts() {
  return PORT_SERVICES.map(p => ({
    port: p.port,
    protocol: p.protocol,
    byte_count: randInt(5000000, 180000000),
    connection_count: randInt(50, 12000),
  })).sort((a, b) => b.byte_count - a.byte_count);
}

export function generateDevices() {
  return LOCAL_IPS.map(ip => {
    const sent = randInt(2000000, 120000000);
    const recv = randInt(5000000, 300000000);
    return {
      ip,
      hostname: null,
      mac_address: `${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}`,
      total_bytes_sent: sent,
      total_bytes_recv: recv,
      packet_count: Math.round((sent + recv) / randInt(200, 800)),
      first_seen: new Date(Date.now() - randInt(3600000, 86400000)).toISOString(),
      last_seen: new Date(Date.now() - randInt(0, 300000)).toISOString(),
      is_local: 1,
    };
  });
}

export function generateFlows(count = 20) {
  const flows = [];
  for (let i = 0; i < count; i++) {
    const srcLocal = seededRandom() > 0.3;
    flows.push({
      src_ip: srcLocal ? pick(LOCAL_IPS) : pick(EXTERNAL_IPS),
      dst_ip: srcLocal ? pick(EXTERNAL_IPS) : pick(LOCAL_IPS),
      protocol: weightedPick(PROTOCOLS, PROTOCOL_WEIGHTS),
      src_port: randInt(1024, 65535),
      dst_port: pick(PORT_SERVICES).port,
      total_bytes: randInt(500000, 80000000),
      packet_count: randInt(100, 50000),
      first_seen: new Date(Date.now() - randInt(60000, 3600000)).toISOString(),
      last_seen: new Date(Date.now() - randInt(0, 60000)).toISOString(),
    });
  }
  return flows.sort((a, b) => b.total_bytes - a.total_bytes);
}

export function generateAnomalies(count = 8) {
  const types = [
    { type: 'bandwidth_spike', severity: 'warning', title: 'Bandwidth spike detected', desc: (ip) => `Traffic from ${ip} exceeded 2σ threshold — sustained 45 MB/s burst for 12 seconds` },
    { type: 'port_scan', severity: 'critical', title: 'Port scan detected', desc: (ip) => `${ip} probed 847 ports on 192.168.1.1 in 3.2 seconds — potential reconnaissance` },
    { type: 'traffic_flood', severity: 'critical', title: 'Traffic flood detected', desc: (ip) => `${ip} generating 24,000 pps — 8x above normal baseline for this device` },
    { type: 'unusual_protocol', severity: 'info', title: 'Unusual protocol activity', desc: (ip) => `ICMP traffic from ${ip} increased 340% — 1,200 echo requests in 60s window` },
    { type: 'bandwidth_spike', severity: 'warning', title: 'High bandwidth consumer', desc: (ip) => `${ip} consuming 62% of total bandwidth — 180 MB transferred in 5 minutes` },
    { type: 'new_device', severity: 'info', title: 'New device detected', desc: (ip) => `Previously unseen device ${ip} joined the network — MAC vendor: Unknown` },
    { type: 'dns_anomaly', severity: 'warning', title: 'Suspicious DNS activity', desc: (ip) => `${ip} made 2,400 DNS queries in 60s — possible DNS tunneling or exfiltration` },
    { type: 'connection_anomaly', severity: 'info', title: 'Unusual connection pattern', desc: (ip) => `${ip} established 340 concurrent TCP connections to 52.94.236.248:443` },
  ];

  return types.slice(0, count).map((t, i) => {
    const srcIp = pick(LOCAL_IPS);
    return {
      id: i + 1,
      ...t,
      description: t.desc(srcIp),
      src_ip: srcIp,
      dst_ip: pick(EXTERNAL_IPS),
      protocol: pick(PROTOCOLS),
      timestamp: new Date(Date.now() - randInt(10000, 3600000)).toISOString(),
      resolved: 0,
    };
  });
}

export function generatePackets(count = 50) {
  const packets = [];
  for (let i = 0; i < count; i++) {
    const protocol = weightedPick(PROTOCOLS, PROTOCOL_WEIGHTS);
    const srcLocal = seededRandom() > 0.4;
    const portInfo = pick(PORT_SERVICES);
    packets.push({
      id: 10000 + i,
      timestamp: new Date(Date.now() - i * randInt(100, 2000)).toISOString(),
      src_ip: srcLocal ? pick(LOCAL_IPS) : pick(EXTERNAL_IPS),
      dst_ip: srcLocal ? pick(EXTERNAL_IPS) : pick(LOCAL_IPS),
      protocol,
      src_port: srcLocal ? randInt(1024, 65535) : portInfo.port,
      dst_port: srcLocal ? portInfo.port : randInt(1024, 65535),
      size: protocol === 'DNS' ? randInt(60, 512) : protocol === 'ICMP' ? 64 : protocol === 'ARP' ? 42 : randInt(52, 1500),
      ttl: pick([64, 128, 255]),
      flags: protocol === 'TCP' ? pick(['SYN', 'ACK', 'SYN-ACK', 'FIN', 'PSH-ACK', 'RST']) : null,
    });
  }
  return packets;
}

export function generateSummary() {
  return {
    total_devices: 12,
    active_devices: randInt(7, 11),
    total_packets: randInt(1200000, 3500000),
    total_bytes: randInt(400000000, 900000000),
    current_bandwidth_bps: randInt(8000000, 18000000),
    current_packets_per_sec: randInt(5000, 12000),
    active_anomalies: 5,
    critical_anomalies: 2,
    top_protocol: 'TCP',
  };
}

export function generateAnomalySummary() {
  return {
    total: 5,
    by_severity: [
      { severity: 'critical', count: 2 },
      { severity: 'warning', count: 3 },
      { severity: 'info', count: 3 },
    ],
  };
}
