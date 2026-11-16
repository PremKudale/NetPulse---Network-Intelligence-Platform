/**
 * NetPulse — Realistic Mock Data Generator
 * Uses enterprise-accurate device inventory, protocol distributions, and
 * bandwidth metrics modeled on CAIDA backbone studies & enterprise campus data.
 *
 * Protocol distribution (by packet count, matching capture engine):
 *   TCP family (HTTPS 55%, HTTP 8%, SSH 3%, RDP 2%, SMTP 1%, other TCP 14%) ≈ 83%
 *   UDP family (DNS 5%, NTP 1%, DHCP <1%, QUIC/video 4%)                    ≈ 11%
 *   ICMP ≈ 2%, ARP ≈ 2%, Other ≈ 2%
 */

// ── Seed-based deterministic random ────────────────────────
let seed = 42;
function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randInt(min, max) { return Math.floor(seededRandom() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(seededRandom() * arr.length)]; }
function randFloat(min, max) { return min + seededRandom() * (max - min); }

// ── Enterprise Device Inventory (matches capture/sniffer.py) ──
const ENTERPRISE_DEVICES = [
  { ip: '192.168.1.1',   mac: '3C:37:86:5D:E4:01', hostname: 'gw-core-01',         role: 'gateway',     vendor: 'Cisco' },
  { ip: '192.168.1.101', mac: 'F0:18:98:3A:B2:10', hostname: 'ws-dev-anand',       role: 'workstation', vendor: 'Dell' },
  { ip: '192.168.1.102', mac: 'A4:83:E7:22:CD:11', hostname: 'ws-dev-priya',       role: 'workstation', vendor: 'Lenovo' },
  { ip: '192.168.1.103', mac: '98:FA:9B:45:1E:12', hostname: 'ws-design-rahul',    role: 'workstation', vendor: 'Apple' },
  { ip: '192.168.1.104', mac: 'BC:D0:74:58:9F:13', hostname: 'ws-mgmt-sneha',      role: 'workstation', vendor: 'HP' },
  { ip: '192.168.1.105', mac: '48:2C:A0:6B:D3:14', hostname: 'ws-sales-vikram',    role: 'workstation', vendor: 'Dell' },
  { ip: '192.168.1.106', mac: '70:5A:0F:7C:E8:15', hostname: 'ws-hr-meera',        role: 'workstation', vendor: 'Lenovo' },
  { ip: '192.168.1.107', mac: 'DC:A6:32:8D:F1:16', hostname: 'ws-finance-arjun',   role: 'workstation', vendor: 'Dell' },
  { ip: '192.168.1.10',  mac: '00:50:56:A1:23:20', hostname: 'srv-app-01',         role: 'server',      vendor: 'VMware' },
  { ip: '192.168.1.11',  mac: '00:50:56:A1:23:21', hostname: 'srv-db-01',          role: 'server',      vendor: 'VMware' },
  { ip: '192.168.1.12',  mac: '00:50:56:A1:23:22', hostname: 'srv-file-01',        role: 'server',      vendor: 'VMware' },
  { ip: '192.168.1.13',  mac: '00:50:56:A1:23:23', hostname: 'srv-mail-01',        role: 'server',      vendor: 'VMware' },
  { ip: '192.168.1.150', mac: '8C:85:90:AB:12:30', hostname: 'mob-iphone-priya',   role: 'mobile',      vendor: 'Apple' },
  { ip: '192.168.1.151', mac: '34:14:B5:CD:34:31', hostname: 'mob-pixel-anand',    role: 'mobile',      vendor: 'Google' },
  { ip: '192.168.1.152', mac: 'E8:6F:38:EF:56:32', hostname: 'laptop-vikram-wifi', role: 'mobile',      vendor: 'Dell' },
  { ip: '192.168.1.200', mac: '00:17:C5:12:78:40', hostname: 'printer-hp-3f',      role: 'iot',         vendor: 'HP' },
  { ip: '192.168.1.201', mac: '7C:2F:80:23:89:41', hostname: 'cam-lobby-01',       role: 'iot',         vendor: 'Hikvision' },
  { ip: '192.168.1.202', mac: '7C:2F:80:34:9A:42', hostname: 'cam-server-room',    role: 'iot',         vendor: 'Hikvision' },
  { ip: '192.168.1.203', mac: 'B0:CE:18:45:AB:43', hostname: 'voip-lobby',         role: 'iot',         vendor: 'Polycom' },
  { ip: '192.168.1.204', mac: '44:07:0B:56:BC:44', hostname: 'ap-wifi-3f',         role: 'iot',         vendor: 'Ubiquiti' },
];

const LOCAL_IPS = ENTERPRISE_DEVICES.map(d => d.ip);

// Real external service endpoints (actual IPs from public DNS)
const EXTERNAL_ENDPOINTS = [
  { ip: '142.250.192.46',  name: 'google.com',                service: 'Google Search' },
  { ip: '142.250.80.46',   name: 'mail.google.com',           service: 'Gmail' },
  { ip: '142.251.33.174',  name: 'drive.google.com',          service: 'Google Drive' },
  { ip: '20.190.159.0',    name: 'login.microsoftonline.com', service: 'Microsoft 365' },
  { ip: '52.96.166.178',   name: 'outlook.office365.com',     service: 'Office 365 Mail' },
  { ip: '13.107.42.14',    name: 'teams.microsoft.com',       service: 'MS Teams' },
  { ip: '151.101.1.140',   name: 'github.com',                service: 'GitHub' },
  { ip: '104.244.42.193',  name: 'twitter.com',               service: 'Twitter/X' },
  { ip: '157.240.1.35',    name: 'facebook.com',              service: 'Facebook' },
  { ip: '151.101.65.69',   name: 'reddit.com',                service: 'Reddit' },
  { ip: '99.84.191.48',    name: 'slack.com',                 service: 'Slack' },
  { ip: '44.238.134.70',   name: 'zoom.us',                   service: 'Zoom Video' },
  { ip: '8.8.8.8',         name: 'dns.google',                service: 'Google DNS' },
  { ip: '1.1.1.1',         name: 'one.one.one.one',           service: 'Cloudflare DNS' },
  { ip: '104.18.32.7',     name: 'cloudflare.com',            service: 'Cloudflare' },
  { ip: '23.32.238.122',   name: 'aws.amazon.com',            service: 'AWS' },
];

const EXTERNAL_IPS = EXTERNAL_ENDPOINTS.map(e => e.ip);

// Enterprise protocol distribution (matches capture engine)
const PROTOCOLS = ['HTTPS', 'TCP', 'HTTP', 'DNS', 'UDP', 'SSH', 'ICMP', 'ARP', 'SMTP', 'RDP', 'NTP', 'DHCP'];
const PROTOCOL_WEIGHTS = [55, 14, 8, 5, 4, 3, 2, 2, 1, 2, 1, 0.5];

const PORT_SERVICES = [
  { port: 443,  protocol: 'TCP', service: 'HTTPS' },
  { port: 80,   protocol: 'TCP', service: 'HTTP' },
  { port: 53,   protocol: 'UDP', service: 'DNS' },
  { port: 22,   protocol: 'TCP', service: 'SSH' },
  { port: 8080, protocol: 'TCP', service: 'HTTP-ALT' },
  { port: 8443, protocol: 'TCP', service: 'HTTPS-ALT' },
  { port: 3306, protocol: 'TCP', service: 'MySQL' },
  { port: 5432, protocol: 'TCP', service: 'PostgreSQL' },
  { port: 25,   protocol: 'TCP', service: 'SMTP' },
  { port: 587,  protocol: 'TCP', service: 'SMTP-TLS' },
  { port: 3389, protocol: 'TCP', service: 'RDP' },
  { port: 445,  protocol: 'TCP', service: 'SMB' },
  { port: 389,  protocol: 'TCP', service: 'LDAP' },
  { port: 636,  protocol: 'TCP', service: 'LDAPS' },
  { port: 123,  protocol: 'UDP', service: 'NTP' },
  { port: 67,   protocol: 'UDP', service: 'DHCP' },
  { port: 161,  protocol: 'UDP', service: 'SNMP' },
  { port: 514,  protocol: 'UDP', service: 'Syslog' },
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

// ── Diurnal bandwidth curve (matches capture engine) ───────
function diurnalMultiplier(hour) {
  if (hour >= 9 && hour < 12) return 0.8 + 0.2 * Math.sin(((hour - 9) / 3) * Math.PI);
  if (hour >= 12 && hour < 14) return 0.5 + 0.1 * Math.sin(((hour - 12) / 2) * Math.PI);
  if (hour >= 14 && hour < 17) return 0.7 + 0.3 * Math.sin(((hour - 14) / 3) * Math.PI);
  if (hour >= 17 && hour < 22) return 0.6 - 0.4 * ((hour - 17) / 5);
  if (hour >= 22 || hour < 7) return 0.15;
  return 0.3 + 0.5 * ((hour - 7) / 2); // 7–9 ramp
}

// ── Generators ─────────────────────────────────────────────

export function generateBandwidthHistory(points = 60) {
  const data = [];
  const now = Date.now();
  // Realistic small-office baseline: ~2–8 Mbps (250 KB/s – 1 MB/s)
  const peakBps = 800000; // 800 KB/s = ~6.4 Mbps at peak
  const peakPps = 300;    // ~300 packets/sec at peak (enterprise: ~250-300 pps per Mbps)

  for (let i = points; i >= 0; i--) {
    const ts = new Date(now - i * 5000);
    const time = ts.toISOString();
    const hourFrac = ts.getHours() + ts.getMinutes() / 60;
    const diurnal = diurnalMultiplier(hourFrac);

    // Micro-burst spikes (~8% chance per sample)
    const spike = seededRandom() > 0.92 ? randFloat(2.5, 8) : 1;
    // Natural jitter ±30%
    const noise = 0.7 + seededRandom() * 0.6;

    data.push({
      time,
      timestamp: time,
      bytes_per_sec: Math.round(peakBps * diurnal * noise * spike),
      packets_per_sec: Math.round(peakPps * diurnal * noise * spike),
      active_devices: Math.round(ENTERPRISE_DEVICES.length * diurnal * (0.6 + seededRandom() * 0.4)),
    });
  }
  return data;
}

export function generateProtocols() {
  // Total traffic ~ 1.2 GB over session (realistic for a few hours)
  const totalBytes = 1_200_000_000;
  return PROTOCOLS.map((protocol, i) => {
    const share = PROTOCOL_WEIGHTS[i] / PROTOCOL_WEIGHTS.reduce((a, b) => a + b, 0);
    const byteCount = Math.round(totalBytes * share * (0.85 + seededRandom() * 0.3));
    // Protocol-appropriate average packet sizes
    const avgSize = {
      'HTTPS': 680, 'TCP': 520, 'HTTP': 740, 'DNS': 120,
      'UDP': 450, 'SSH': 280, 'ICMP': 84, 'ARP': 42,
      'SMTP': 620, 'RDP': 890, 'NTP': 76, 'DHCP': 340,
    }[protocol] || 500;
    return {
      protocol,
      byte_count: byteCount,
      packet_count: Math.round(byteCount / avgSize),
    };
  }).sort((a, b) => b.byte_count - a.byte_count);
}

export function generatePorts() {
  // Port traffic weighted by realistic enterprise usage
  const portWeights = {
    443: 55, 80: 8, 53: 5, 22: 3, 8080: 2, 8443: 2,
    3306: 1.5, 5432: 1.5, 25: 0.5, 587: 0.5, 3389: 2,
    445: 1.5, 389: 0.8, 636: 0.5, 123: 1, 67: 0.3, 161: 0.5, 514: 0.5,
  };
  return PORT_SERVICES.map(p => {
    const weight = portWeights[p.port] || 1;
    return {
      port: p.port,
      protocol: p.protocol,
      service: p.service,
      byte_count: Math.round(weight * randInt(800_000, 3_000_000)),
      connection_count: Math.round(weight * randInt(20, 400)),
    };
  }).sort((a, b) => b.byte_count - a.byte_count);
}

export function generateDevices() {
  return ENTERPRISE_DEVICES.map(dev => {
    // Traffic volume varies by role
    const roleMultiplier = {
      gateway: 8, server: 5, workstation: 2, mobile: 1.2, iot: 0.5,
    }[dev.role] || 1;

    const sent = Math.round(randInt(2_000_000, 50_000_000) * roleMultiplier);
    const recv = Math.round(randInt(5_000_000, 120_000_000) * roleMultiplier);
    const avgPktSize = dev.role === 'iot' ? 200 : dev.role === 'server' ? 700 : 500;

    return {
      ip: dev.ip,
      hostname: dev.hostname,
      mac_address: dev.mac,
      vendor: dev.vendor,
      role: dev.role,
      total_bytes_sent: sent,
      total_bytes_recv: recv,
      packet_count: Math.round((sent + recv) / avgPktSize),
      first_seen: new Date(Date.now() - randInt(3_600_000, 86_400_000)).toISOString(),
      last_seen: new Date(Date.now() - randInt(0, 300_000)).toISOString(),
      is_local: 1,
    };
  });
}

export function generateFlows(count = 20) {
  const flows = [];
  for (let i = 0; i < count; i++) {
    const direction = seededRandom();
    let srcIp, dstIp;
    if (direction < 0.55) {
      // Internal → External (55%)
      srcIp = pick(LOCAL_IPS);
      dstIp = pick(EXTERNAL_IPS);
    } else if (direction < 0.85) {
      // External → Internal (30%)
      srcIp = pick(EXTERNAL_IPS);
      dstIp = pick(LOCAL_IPS);
    } else {
      // Internal → Internal (15%)
      srcIp = pick(LOCAL_IPS);
      dstIp = pick(LOCAL_IPS.filter(ip => ip !== srcIp));
    }
    const proto = weightedPick(PROTOCOLS, PROTOCOL_WEIGHTS);
    const portInfo = pick(PORT_SERVICES);
    flows.push({
      src_ip: srcIp,
      dst_ip: dstIp,
      protocol: proto,
      src_port: randInt(49152, 65535),
      dst_port: portInfo.port,
      total_bytes: randInt(50_000, 25_000_000),
      packet_count: randInt(50, 15_000),
      first_seen: new Date(Date.now() - randInt(60_000, 3_600_000)).toISOString(),
      last_seen: new Date(Date.now() - randInt(0, 60_000)).toISOString(),
    });
  }
  return flows.sort((a, b) => b.total_bytes - a.total_bytes);
}

export function generateAnomalies(count = 12) {
  const ANOMALY_TEMPLATES = [
    {
      type: 'bandwidth_spike', severity: 'warning',
      title: 'Bandwidth spike detected',
      desc: (ip, dst) => `Traffic from ${ip} exceeded 2σ threshold — sustained ${randInt(2,8)} Mbps burst for ${randInt(5,30)} seconds (baseline: ${randFloat(0.3,1.2).toFixed(1)} Mbps)`,
    },
    {
      type: 'bandwidth_spike', severity: 'critical',
      title: 'Extreme bandwidth surge',
      desc: (ip, dst) => `${ip} → ${dst} saturating uplink at ${randInt(12,25)} Mbps — ${randInt(3,6)}σ above rolling average, possible data exfiltration or cloud sync storm`,
    },
    {
      type: 'port_scan', severity: 'critical',
      title: 'Horizontal port scan detected',
      desc: (ip, dst) => `${ip} probed ${randInt(80,400)} ports on ${dst} in ${(randInt(15,50)/10).toFixed(1)}s — SYN sweep pattern (nmap-like)`,
    },
    {
      type: 'port_scan', severity: 'warning',
      title: 'Vertical port scan detected',
      desc: (ip, dst) => `${ip} scanning port ${pick([22,23,3389,445,8080])} across ${randInt(8,20)} internal hosts — lateral enumeration attempt`,
    },
    {
      type: 'traffic_flood', severity: 'critical',
      title: 'SYN flood detected',
      desc: (ip, dst) => `${ip} sending ${randInt(5000,20000).toLocaleString()} SYN packets/sec to ${dst}:${pick([80,443,8080])} — possible DoS attack`,
    },
    {
      type: 'traffic_flood', severity: 'warning',
      title: 'UDP flood detected',
      desc: (ip, dst) => `${ip} generating ${randInt(3000,12000).toLocaleString()} UDP pps to ${dst} — ${randInt(4,12)}x above baseline`,
    },
    {
      type: 'dns_anomaly', severity: 'warning',
      title: 'Suspicious DNS query volume',
      desc: (ip) => `${ip} issued ${randInt(800,3000).toLocaleString()} DNS queries in 60s — possible DNS tunneling or C2 beaconing`,
    },
    {
      type: 'dns_anomaly', severity: 'critical',
      title: 'DNS exfiltration pattern',
      desc: (ip) => `${ip} sending TXT queries with ${randInt(200,500)}-byte payloads to suspicious subdomain — data exfiltration signature`,
    },
    {
      type: 'unusual_protocol', severity: 'info',
      title: 'Unusual ICMP activity',
      desc: (ip) => `ICMP traffic from ${ip} increased ${randInt(200,500)}% — ${randInt(300,1500).toLocaleString()} echo requests in 60s window`,
    },
    {
      type: 'unusual_protocol', severity: 'warning',
      title: 'IRC protocol on non-standard port',
      desc: (ip, dst) => `IRC traffic detected from ${ip} to ${dst}:${randInt(6660,6669)} — potential botnet C2 channel`,
    },
    {
      type: 'new_device', severity: 'info',
      title: 'New device joined network',
      desc: (ip) => `Previously unseen device ${ip} (MAC: ${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}:${randInt(0,255).toString(16).padStart(2,'0')}:xx:xx:xx) — vendor: Unknown`,
    },
    {
      type: 'new_device', severity: 'warning',
      title: 'Rogue DHCP server detected',
      desc: (ip) => `${ip} responding to DHCP DISCOVER requests — unauthorized DHCP server may cause network disruption`,
    },
    {
      type: 'connection_anomaly', severity: 'info',
      title: 'Unusual connection volume',
      desc: (ip, dst) => `${ip} established ${randInt(80,300)} concurrent TCP connections to ${dst}:443 — above p99 threshold`,
    },
    {
      type: 'connection_anomaly', severity: 'warning',
      title: 'Connection to known-bad IP',
      desc: (ip, dst) => `${ip} → ${dst}:${pick([4444,5555,1337,31337])} — destination matches threat intelligence blocklist (Emerging Threats)`,
    },
    {
      type: 'arp_spoofing', severity: 'critical',
      title: 'ARP spoofing detected',
      desc: (ip) => `Multiple ARP replies mapping ${ip} to different MACs — possible man-in-the-middle attack on gateway`,
    },
    {
      type: 'geo_anomaly', severity: 'warning',
      title: 'Connection to unusual geography',
      desc: (ip, dst) => `${ip} established TLS session to ${dst} — GeoIP: ${pick(['RU','CN','KP','IR'])} (flagged region), no prior baseline`,
    },
    {
      type: 'payload_anomaly', severity: 'warning',
      title: 'Oversized packet detected',
      desc: (ip, dst) => `${ip} → ${dst} transmitting ${randInt(9000,65000)}-byte frames — exceeds network MTU (1500), possible fragmentation attack`,
    },
    {
      type: 'payload_anomaly', severity: 'info',
      title: 'Unusual payload size distribution',
      desc: (ip, dst) => `Traffic from ${ip} shows bimodal packet sizes (64B and ${randInt(1400,1500)}B only) — possible covert channel indicator`,
    },
  ];

  const shuffled = [...ANOMALY_TEMPLATES].sort(() => seededRandom() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((t, i) => {
    const srcDev = pick(ENTERPRISE_DEVICES);
    const dstIp = pick(EXTERNAL_IPS);
    return {
      id: i + 1,
      type: t.type,
      severity: t.severity,
      title: t.title,
      description: t.desc(srcDev.ip, dstIp),
      src_ip: srcDev.ip,
      dst_ip: dstIp,
      protocol: t.type === 'dns_anomaly' ? 'DNS' : t.type === 'arp_spoofing' ? 'ARP' : pick(PROTOCOLS),
      timestamp: new Date(Date.now() - randInt(10_000, 7_200_000)).toISOString(),
      resolved: 0,
    };
  });
}

export function generatePackets(count = 50) {
  const packets = [];
  for (let i = 0; i < count; i++) {
    const protocol = weightedPick(PROTOCOLS, PROTOCOL_WEIGHTS);
    const direction = seededRandom();
    let srcIp, dstIp;
    if (direction < 0.55) {
      srcIp = pick(LOCAL_IPS);
      dstIp = pick(EXTERNAL_IPS);
    } else if (direction < 0.85) {
      srcIp = pick(EXTERNAL_IPS);
      dstIp = pick(LOCAL_IPS);
    } else {
      srcIp = pick(LOCAL_IPS);
      dstIp = pick(LOCAL_IPS.filter(ip => ip !== srcIp));
    }
    const portInfo = pick(PORT_SERVICES);

    // Realistic packet sizes per protocol
    let size;
    if (['DNS', 'NTP', 'DHCP'].includes(protocol)) size = randInt(60, 512);
    else if (['ARP', 'IGMP'].includes(protocol)) size = randInt(42, 60);
    else if (protocol === 'ICMP') size = pick([64, 84, 98, 128]);
    else if (seededRandom() < 0.4) size = randInt(54, 128);  // ACK/small
    else size = randInt(256, 1460);  // data segment

    // Realistic TTL values
    const isExternal = EXTERNAL_IPS.includes(srcIp);
    const ttl = isExternal
      ? pick([47, 52, 55, 57, 113, 116, 118, 120, 244, 248])
      : pick([64, 128]);

    packets.push({
      id: 10000 + i,
      timestamp: new Date(Date.now() - i * randInt(80, 1500)).toISOString(),
      src_ip: srcIp,
      dst_ip: dstIp,
      protocol,
      src_port: direction < 0.55 ? randInt(49152, 65535) : portInfo.port,
      dst_port: direction < 0.55 ? portInfo.port : randInt(49152, 65535),
      size,
      ttl,
      flags: ['TCP', 'HTTPS', 'HTTP', 'SSH', 'SMTP', 'RDP'].includes(protocol)
        ? pick(['SYN', 'SYN-ACK', 'ACK', 'PSH-ACK', 'ACK', 'PSH-ACK', 'ACK', 'FIN-ACK', 'RST'])
        : null,
    });
  }
  return packets;
}

export function generateSummary() {
  const hour = new Date().getHours();
  const diurnal = diurnalMultiplier(hour);

  // Realistic small-office metrics
  const baseBandwidthBps = 800_000; // 800 KB/s peak
  const basePps = 300;

  return {
    total_devices: ENTERPRISE_DEVICES.length,
    active_devices: Math.round(ENTERPRISE_DEVICES.length * diurnal * (0.6 + seededRandom() * 0.4)),
    total_packets: randInt(500_000, 2_000_000),
    total_bytes: randInt(250_000_000, 1_200_000_000),
    current_bandwidth_bps: Math.round(baseBandwidthBps * diurnal * (0.7 + seededRandom() * 0.6)),
    current_packets_per_sec: Math.round(basePps * diurnal * (0.7 + seededRandom() * 0.6)),
    active_anomalies: randInt(3, 8),
    critical_anomalies: randInt(1, 3),
    top_protocol: 'HTTPS',
  };
}

export function generateAnomalySummary() {
  return {
    total: randInt(10, 18),
    by_severity: [
      { severity: 'critical', count: randInt(2, 5) },
      { severity: 'warning', count: randInt(4, 8) },
      { severity: 'info', count: randInt(3, 6) },
    ],
  };
}
