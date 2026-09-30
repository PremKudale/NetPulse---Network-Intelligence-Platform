import { useState, useMemo, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import './IntelligenceFlowGraph.css';

// ── Pipeline Stages Definition ───────────────────────────
const STAGES = [
  { id: 'signals', num: '01', title: 'SIGNALS', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', x: 140 },
  { id: 'intelligence', num: '02', title: 'INTELLIGENCE', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', x: 440 },
  { id: 'context', num: '03', title: 'CONTEXT', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', x: 740 },
  { id: 'outcomes', num: '04', title: 'OUTCOMES', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', x: 1040 },
];

// ── Graph Nodes ──────────────────────────────────────────
const NODES = [
  // ── 01 SIGNALS (Amber) ──────────────────────────────────
  {
    id: 'l3-l4-frames',
    stage: 'signals',
    label: 'L3/L4 Frames',
    sub: 'Promiscuous sniffer',
    icon: 'radio',
    x: 140,
    y: 95,
    dotOffsetX: 70,
    dotOffsetY: 12,
    metric: '8,420 pkts/s',
    tag: 'Layer 3/4',
    desc: 'Raw Ethernet frames and IP packets captured in promiscuous mode via Scapy socket listener.',
    tech: 'AF_PACKET / Npcap · Promiscuous Ingestion · Zero-Copy Ring',
  },
  {
    id: 'tcp-handshake',
    stage: 'signals',
    label: 'TCP Handshake',
    sub: 'SYN/ACK/FIN state',
    icon: 'link',
    x: 140,
    y: 195,
    dotOffsetX: 72,
    dotOffsetY: 12,
    metric: '3,180 flows',
    tag: 'Protocol',
    desc: 'Stateful transmission control protocol stream tracking, 3-way handshake verification, and sequence delta analysis.',
    tech: 'RFC 793 · Full-duplex connection state tracking',
  },
  {
    id: 'udp-bursts',
    stage: 'signals',
    label: 'UDP Datagrams',
    sub: 'DNS/QUIC streams',
    icon: 'zap',
    x: 140,
    y: 295,
    dotOffsetX: 70,
    dotOffsetY: 12,
    metric: '1,940 pkts/s',
    tag: 'Protocol',
    desc: 'Stateless datagram ingestion monitoring high-frequency telemetry, DNS queries, VoIP, and QUIC encrypted streams.',
    tech: 'RFC 768 · Low latency unacknowledged datagrams',
  },
  {
    id: 'dns-inquiries',
    stage: 'signals',
    label: 'DNS Inquiries',
    sub: 'Port 53 resolvers',
    icon: 'search',
    x: 140,
    y: 395,
    dotOffsetX: 68,
    dotOffsetY: 12,
    metric: '412 req/s',
    tag: 'Application',
    desc: 'Domain Name System resolution telemetry, analyzing recursive query payloads and anomalous domain entropy.',
    tech: 'RFC 1035 · A/AAAA/CNAME record dissection',
  },
  {
    id: 'tls-traffic',
    stage: 'signals',
    label: 'TLS / HTTPS',
    sub: 'Encrypted L7 metadata',
    icon: 'shield',
    x: 140,
    y: 495,
    dotOffsetX: 68,
    dotOffsetY: 12,
    metric: '6,210 streams',
    tag: 'Security',
    desc: 'TLS 1.2/1.3 ClientHello SNI inspection, cipher suite negotiation tracking, and certificate sanity validation.',
    tech: 'RFC 8446 · SNI header dissection without decryption',
  },
  {
    id: 'icmp-arp',
    stage: 'signals',
    label: 'ICMP & ARP',
    sub: 'Echo probes & L2 map',
    icon: 'activity',
    x: 140,
    y: 595,
    dotOffsetX: 65,
    dotOffsetY: 12,
    metric: '92 pkts/s',
    tag: 'Network',
    desc: 'Control message protocol diagnostics and Address Resolution Protocol subnet mapping for host discovery.',
    tech: 'RFC 792 · Ping echo latency & L2 MAC table mapping',
  },

  // ── 02 INTELLIGENCE (Pink) ──────────────────────────────
  {
    id: 'dpi-parser',
    stage: 'intelligence',
    label: 'Deep Packet Inspection',
    sub: 'L7 protocol dissection',
    icon: 'layers',
    x: 440,
    y: 130,
    dotOffsetX: 88,
    dotOffsetY: 12,
    metric: '99.8% parsed',
    tag: 'Inspection',
    desc: 'High-speed deep packet inspection dissecting variable length headers, flags, payload lengths, and ephemeral ports.',
    tech: 'Zero-copy byte buffer parser · Protocol classifier',
  },
  {
    id: 'flow-engine',
    stage: 'intelligence',
    label: 'Flow Aggregator',
    sub: '5-tuple socket pairings',
    icon: 'cpu',
    x: 440,
    y: 260,
    dotOffsetX: 76,
    dotOffsetY: 12,
    metric: '5s rolling window',
    tag: 'Pipeline',
    desc: 'Bi-directional socket aggregation grouping (src_ip, dst_ip, src_port, dst_port, proto) into consolidated telemetry flows.',
    tech: 'Sliding window in-memory hash index with TTL pruning',
  },
  {
    id: 'top-talkers',
    stage: 'intelligence',
    label: 'Top-Talker Profiling',
    sub: 'Host bandwidth quotas',
    icon: 'barchart',
    x: 440,
    y: 400,
    dotOffsetX: 82,
    dotOffsetY: 12,
    metric: '18 hosts active',
    tag: 'Profiling',
    desc: 'Continuous byte and packet volume attribution per IP and MAC address, sorting network nodes by consumption rank.',
    tech: 'Top-K streaming frequency algorithm (Heavy Hitters)',
  },
  {
    id: 'gaussian-model',
    stage: 'intelligence',
    label: 'Gaussian Baseline Engine',
    sub: 'Dynamic μ ± 2σ model',
    icon: 'trending',
    x: 440,
    y: 535,
    dotOffsetX: 92,
    dotOffsetY: 12,
    metric: '2σ threshold',
    tag: 'Statistical',
    desc: 'Real-time statistical dispersion tracking mean throughput (μ) and standard deviation (σ) to detect significant anomalies.',
    tech: 'Welford online variance algorithm · Real-time drift adaptation',
  },

  // ── 03 CONTEXT (Green) ───────────────────────────────────
  {
    id: 'port-scan-radar',
    stage: 'context',
    label: 'Port Scan Radar',
    sub: 'Reconnaissance detector',
    icon: 'target',
    x: 740,
    y: 110,
    dotOffsetX: 76,
    dotOffsetY: 12,
    metric: '>20 ports/10s',
    tag: 'Threat Context',
    desc: 'Maintains sliding 10-second window tracking distinct destination ports targeted by any unique source IP address.',
    tech: 'HyperLogLog port cardinality estimation',
  },
  {
    id: 'bandwidth-surge',
    stage: 'context',
    label: 'Bandwidth Surge Monitor',
    sub: 'Volumetric deviation',
    icon: 'activity',
    x: 740,
    y: 220,
    dotOffsetX: 90,
    dotOffsetY: 12,
    metric: '14.2 MB/s peak',
    tag: 'Capacity',
    desc: 'Correlates current traffic ingress and egress against historical baselines, triggering warning alerts upon surge detection.',
    tech: 'Exponential moving average (EMA) threshold crossing',
  },
  {
    id: 'pps-flood-sentinel',
    stage: 'context',
    label: 'PPS Flood Sentinel',
    sub: 'DoS / buffer exhaustion',
    icon: 'shieldAlert',
    x: 740,
    y: 330,
    dotOffsetX: 84,
    dotOffsetY: 12,
    metric: '>500 pkts/s cap',
    tag: 'Defense',
    desc: 'Detects packet-per-second surges from individual endpoints designed to overwhelm buffers or saturate network interfaces.',
    tech: 'Token bucket rate-limiting heuristic & threshold filter',
  },
  {
    id: 'subnet-topology',
    stage: 'context',
    label: 'Subnet Topology Map',
    sub: 'VLAN & Gateway hops',
    icon: 'globe',
    x: 740,
    y: 440,
    dotOffsetX: 80,
    dotOffsetY: 12,
    metric: '192.168.1.0/24',
    tag: 'Topology',
    desc: 'Discovers active network subnet masks, default gateway paths, local broadcast domains, and rogue alien IP addresses.',
    tech: 'ARP table cache inspection & reverse DNS PTR checks',
  },
  {
    id: 'threat-matrix',
    stage: 'context',
    label: 'Threat Severity Matrix',
    sub: 'Weighted risk scoring',
    icon: 'shield',
    x: 740,
    y: 550,
    dotOffsetX: 84,
    dotOffsetY: 12,
    metric: 'Score: 12 (LOW)',
    tag: 'Scoring',
    desc: 'Multi-variable risk scoring combining protocol anomaly weights, port reputation lists, and transmission frequency.',
    tech: 'Bayesian multi-factor threat assessment model',
  },

  // ── 04 OUTCOMES (Cyan) ───────────────────────────────────
  {
    id: 'noc-dashboard',
    stage: 'outcomes',
    label: 'NOC Command Center',
    sub: '60 FPS Live Telemetry',
    icon: 'monitor',
    x: 1040,
    y: 110,
    dotOffsetX: 86,
    dotOffsetY: 12,
    metric: 'Sub-second sync',
    tag: 'Observability',
    desc: 'Streams real-time bandwidth meters, active device catalogues, and packet inspector feeds via Socket.IO WebSocket.',
    tech: 'Socket.IO duplex broadcast · Framer Motion charts',
  },
  {
    id: 'threat-dispatch',
    stage: 'outcomes',
    label: 'Security Alert Dispatch',
    sub: 'Automated SecOps alerts',
    icon: 'bell',
    x: 1040,
    y: 220,
    dotOffsetX: 88,
    dotOffsetY: 12,
    metric: '0.12s latency',
    tag: 'SecOps',
    desc: 'Instant broadcast of high-severity port scans, traffic floods, and rogue protocol violations to operator alerts table.',
    tech: 'Webhook dispatch & event-driven alert pipeline',
  },
  {
    id: 'device-health',
    stage: 'outcomes',
    label: 'Device Health Index',
    sub: 'Top talkers & rogue hosts',
    icon: 'list',
    x: 1040,
    y: 330,
    dotOffsetX: 78,
    dotOffsetY: 12,
    metric: '100% compliant',
    tag: 'Asset Mgmt',
    desc: 'Live catalogue of all local endpoints, mapping hardware MAC manufacturers, IP lease durations, and data consumption.',
    tech: 'SQLite device_stats table with relational upserts',
  },
  {
    id: 'capacity-forecast',
    stage: 'outcomes',
    label: 'Capacity Forecast',
    sub: 'Hourly / weekly projections',
    icon: 'clock',
    x: 1040,
    y: 440,
    dotOffsetX: 78,
    dotOffsetY: 12,
    metric: '+4.2% / week',
    tag: 'Planning',
    desc: 'Aggregates historical network volume across hourly, daily, and weekly buckets for ISP bandwidth budgeting.',
    tech: 'SQLite time-series rollups & trend regressions',
  },
  {
    id: 'auto-quarantine',
    stage: 'outcomes',
    label: 'Firewall Drop Rule',
    sub: 'Dynamic IP containment',
    icon: 'shield',
    x: 1040,
    y: 550,
    dotOffsetX: 78,
    dotOffsetY: 12,
    metric: 'Auto-contain',
    tag: 'Containment',
    desc: 'Generates automated iptables and Windows Defender firewall drop rules targeting malicious scan sources.',
    tech: 'Automated policy synthesis & zero-trust isolation',
  },
];

// ── Synaptic Path Connections ────────────────────────────
const CONNECTIONS = [
  // Signals -> Intelligence
  { from: 'l3-l4-frames', to: 'dpi-parser', speed: 2.8, color: '#f59e0b' },
  { from: 'l3-l4-frames', to: 'flow-engine', speed: 3.2, color: '#f59e0b' },
  { from: 'tcp-handshake', to: 'flow-engine', speed: 3.5, color: '#f59e0b' },
  { from: 'tcp-handshake', to: 'dpi-parser', speed: 4.0, color: '#f59e0b' },
  { from: 'tcp-handshake', to: 'gaussian-model', speed: 4.2, color: '#f59e0b' },
  { from: 'udp-bursts', to: 'flow-engine', speed: 3.0, color: '#f59e0b' },
  { from: 'udp-bursts', to: 'gaussian-model', speed: 3.8, color: '#f59e0b' },
  { from: 'dns-inquiries', to: 'dpi-parser', speed: 3.4, color: '#f59e0b' },
  { from: 'dns-inquiries', to: 'top-talkers', speed: 4.5, color: '#f59e0b' },
  { from: 'tls-traffic', to: 'dpi-parser', speed: 3.1, color: '#f59e0b' },
  { from: 'tls-traffic', to: 'top-talkers', speed: 3.7, color: '#f59e0b' },
  { from: 'icmp-arp', to: 'top-talkers', speed: 4.0, color: '#f59e0b' },
  { from: 'icmp-arp', to: 'gaussian-model', speed: 4.8, color: '#f59e0b' },

  // Intelligence -> Context
  { from: 'dpi-parser', to: 'port-scan-radar', speed: 3.2, color: '#f43f5e' },
  { from: 'dpi-parser', to: 'subnet-topology', speed: 4.2, color: '#f43f5e' },
  { from: 'flow-engine', to: 'bandwidth-surge', speed: 2.9, color: '#f43f5e' },
  { from: 'flow-engine', to: 'pps-flood-sentinel', speed: 3.6, color: '#f43f5e' },
  { from: 'flow-engine', to: 'subnet-topology', speed: 4.4, color: '#f43f5e' },
  { from: 'top-talkers', to: 'subnet-topology', speed: 3.8, color: '#f43f5e' },
  { from: 'top-talkers', to: 'threat-matrix', speed: 4.1, color: '#f43f5e' },
  { from: 'gaussian-model', to: 'bandwidth-surge', speed: 3.3, color: '#f43f5e' },
  { from: 'gaussian-model', to: 'threat-matrix', speed: 3.9, color: '#f43f5e' },
  { from: 'gaussian-model', to: 'pps-flood-sentinel', speed: 4.3, color: '#f43f5e' },

  // Context -> Outcomes
  { from: 'port-scan-radar', to: 'threat-dispatch', speed: 2.6, color: '#10b981', attack: true },
  { from: 'port-scan-radar', to: 'auto-quarantine', speed: 3.2, color: '#10b981', attack: true },
  { from: 'bandwidth-surge', to: 'noc-dashboard', speed: 2.7, color: '#10b981' },
  { from: 'bandwidth-surge', to: 'threat-dispatch', speed: 3.4, color: '#10b981', attack: true },
  { from: 'bandwidth-surge', to: 'capacity-forecast', speed: 4.2, color: '#10b981' },
  { from: 'pps-flood-sentinel', to: 'threat-dispatch', speed: 2.9, color: '#10b981', attack: true },
  { from: 'pps-flood-sentinel', to: 'auto-quarantine', speed: 3.5, color: '#10b981', attack: true },
  { from: 'subnet-topology', to: 'device-health', speed: 3.6, color: '#10b981' },
  { from: 'subnet-topology', to: 'noc-dashboard', speed: 4.1, color: '#10b981' },
  { from: 'threat-matrix', to: 'threat-dispatch', speed: 2.8, color: '#10b981' },
  { from: 'threat-matrix', to: 'device-health', speed: 3.9, color: '#10b981' },
  { from: 'threat-matrix', to: 'auto-quarantine', speed: 3.3, color: '#10b981' },
];

// Helper to compute node dot anchor
function getNodeAnchor(node) {
  return {
    x: node.x + (node.dotOffsetX || 60),
    y: node.y + (node.dotOffsetY || 12),
  };
}

// Generate smooth S-curve cubic bezier path
function makeBezierPath(p1, p2) {
  const dx = p2.x - p1.x;
  const cx1 = p1.x + dx * 0.5;
  const cy1 = p1.y;
  const cx2 = p1.x + dx * 0.5;
  const cy2 = p2.y;
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

// Simple SVG icon renderer
function NodeIcon({ type, color }) {
  switch (type) {
    case 'radio':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
          <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
        </svg>
      );
    case 'link':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'zap':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'search':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'shield':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'activity':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'layers':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'cpu':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
        </svg>
      );
    case 'barchart':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      );
    case 'trending':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'target':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'shieldAlert':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'globe':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'monitor':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'bell':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'list':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'clock':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

export default function IntelligenceFlowGraph({ isCompact = false }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState('dpi-parser');
  const [activeSimulation, setActiveSimulation] = useState('normal'); // 'normal' | 'scan' | 'surge' | 'flood'
  const [flowSpeed, setFlowSpeed] = useState(1); // 0.5, 1, 2, 0 (paused)
  const [activeStageFilter, setActiveStageFilter] = useState('all');

  // Real-time live socket connection
  const { data: bandwidth } = useSocket('stats:bandwidth', { packets_per_sec: 0, bytes_per_sec: 0 });
  const { data: latestAnomaly } = useSocket('anomaly:alert', null);

  // If live anomaly received, briefly trigger warning animation
  useEffect(() => {
    if (!latestAnomaly) return;
    const startTimer = setTimeout(() => {
      setActiveSimulation('scan');
    }, 10);
    const resetTimer = setTimeout(() => {
      setActiveSimulation('normal');
    }, 6000);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(resetTimer);
    };
  }, [latestAnomaly]);

  // Fast node lookup
  const nodeMap = useMemo(() => {
    const map = new Map();
    NODES.forEach(n => map.set(n.id, n));
    return map;
  }, []);

  // Compute connected nodes and curves for hovered node
  const highlightedData = useMemo(() => {
    if (!hoveredNodeId && !selectedNodeId) return { activeNodeIds: new Set(), activeCurveKeys: new Set() };
    const targetId = hoveredNodeId || selectedNodeId;
    const activeNodeIds = new Set([targetId]);
    const activeCurveKeys = new Set();

    CONNECTIONS.forEach(conn => {
      if (conn.from === targetId) {
        activeNodeIds.add(conn.to);
        activeCurveKeys.add(`${conn.from}->${conn.to}`);
      }
      if (conn.to === targetId) {
        activeNodeIds.add(conn.from);
        activeCurveKeys.add(`${conn.from}->${conn.to}`);
      }
    });

    return { activeNodeIds, activeCurveKeys };
  }, [hoveredNodeId, selectedNodeId]);

  // Active selected node object
  const selectedNode = useMemo(() => {
    return nodeMap.get(selectedNodeId) || NODES[0];
  }, [selectedNodeId, nodeMap]);

  return (
    <div className={`flow-graph-container ${isCompact ? 'compact' : ''}`}>
      {/* Ambient background glows */}
      <div className="flow-glow-backdrop">
        <div className="flow-glow-spot stage-1" />
        <div className="flow-glow-spot stage-2" />
        <div className="flow-glow-spot stage-3" />
        <div className="flow-glow-spot stage-4" />
      </div>

      {/* Top Header & Simulation Controls */}
      <div className="flow-graph-header">
        <div className="flow-graph-title-group">
          <div className="flow-status-badge">
            <span className="flow-status-pulse" />
            LIVE TELEMETRY FLOW
          </div>
          <div>
            <h3 className="flow-graph-title">Neural Network Intelligence Architecture</h3>
            <div className="flow-graph-subtitle">
              Dynamic multi-stage packet pipeline: Capture · Ingestion · Heuristics · Mitigation
            </div>
          </div>
        </div>

        <div className="flow-controls-bar">
          {/* Stage Filters */}
          <button
            className={`flow-btn ${activeStageFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveStageFilter('all')}
          >
            All Stages
          </button>

          {/* Incident Simulation Mode Buttons */}
          <button
            className={`flow-btn ${activeSimulation === 'scan' ? 'danger-active' : ''}`}
            onClick={() => setActiveSimulation(prev => (prev === 'scan' ? 'normal' : 'scan'))}
            title="Simulate rapid TCP port sweep hitting anomaly radar"
          >
            <span style={{ color: '#fb7185' }}>⚡</span> Simulate Port Scan
          </button>

          <button
            className={`flow-btn ${activeSimulation === 'surge' ? 'active' : ''}`}
            onClick={() => setActiveSimulation(prev => (prev === 'surge' ? 'normal' : 'surge'))}
            title="Simulate heavy bandwidth volume surge"
          >
            <span style={{ color: '#ffc857' }}>📈</span> Bandwidth Surge
          </button>

          {/* Speed Toggle */}
          <button
            className="flow-btn"
            onClick={() => setFlowSpeed(prev => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1))}
            title="Toggle particle animation velocity"
          >
            Velocity: {flowSpeed}x
          </button>
        </div>
      </div>

      {/* SVG Flow Canvas */}
      <div className="flow-svg-viewport">
        <svg
          className="flow-svg"
          viewBox="0 0 1200 680"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft Radial Glow Filters */}
            <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="photon-particle-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stage Path Gradients */}
            <linearGradient id="grad-amber-pink" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <linearGradient id="grad-pink-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="grad-green-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="grad-attack-laser" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#ff0055" />
              <stop offset="100%" stopColor="#ffb703" />
            </linearGradient>
          </defs>

          {/* Vertical Stage Grid Dividers & Column Headers */}
          {STAGES.map((stg, i) => (
            <g key={stg.id}>
              {/* Column Separator Dashed Lines */}
              {i > 0 && (
                <line
                  x1={stg.x - 150}
                  y1={40}
                  x2={stg.x - 150}
                  y2={650}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 6"
                />
              )}

              {/* Column Stage Header */}
              <text
                x={stg.x}
                y={32}
                textAnchor="middle"
                fill={stg.color}
                fontSize="11"
                fontWeight="800"
                fontFamily="var(--font-mono)"
                letterSpacing="0.14em"
              >
                {stg.num} {stg.title}
              </text>
            </g>
          ))}

          {/* ── Spline Bezier Paths & Flowing Photons ──────── */}
          <g className="flow-connections-layer">
            {CONNECTIONS.map(conn => {
              const fromNode = nodeMap.get(conn.from);
              const toNode = nodeMap.get(conn.to);
              if (!fromNode || !toNode) return null;

              const p1 = getNodeAnchor(fromNode);
              const p2 = getNodeAnchor(toNode);
              const pathData = makeBezierPath(p1, p2);
              const curveKey = `${conn.from}->${conn.to}`;

              const isHighlighted = highlightedData.activeCurveKeys.has(curveKey);
              const isDimmed =
                (hoveredNodeId || selectedNodeId) &&
                !isHighlighted &&
                activeSimulation === 'normal';

              const isAttackPath =
                (activeSimulation === 'scan' || activeSimulation === 'surge') && conn.attack;

              // Color gradient selection
              let strokeColor = 'rgba(255, 255, 255, 0.12)';
              if (isAttackPath) {
                strokeColor = 'url(#grad-attack-laser)';
              } else if (isHighlighted) {
                if (fromNode.stage === 'signals') strokeColor = 'url(#grad-amber-pink)';
                else if (fromNode.stage === 'intelligence') strokeColor = 'url(#grad-pink-green)';
                else strokeColor = 'url(#grad-green-cyan)';
              }

              const pathId = `curve-${conn.from}-${conn.to}`;
              const baseDuration = (conn.speed / flowSpeed).toFixed(2);

              return (
                <g key={curveKey}>
                  {/* Base Connecting Spline */}
                  <path
                    id={pathId}
                    d={pathData}
                    className={`flow-curve ${isDimmed ? 'dimmed' : ''} ${isHighlighted || isAttackPath ? 'highlighted' : ''}`}
                    stroke={strokeColor}
                    strokeWidth={isAttackPath ? 2.8 : isHighlighted ? 2.2 : 1.2}
                    opacity={isAttackPath ? 1 : isHighlighted ? 0.95 : 0.16}
                    filter={isHighlighted || isAttackPath ? 'drop-shadow(0 0 6px currentColor)' : undefined}
                  />

                  {/* Flowing Animated Light Particle along the Bezier Path */}
                  {flowSpeed > 0 && !isDimmed && (
                    <circle
                      r={isAttackPath ? 3.6 : isHighlighted ? 3 : 2.2}
                      fill={isAttackPath ? '#ff3b3b' : isHighlighted ? '#ffffff' : conn.color}
                      filter="url(#photon-particle-glow)"
                      opacity={isAttackPath ? 1 : isHighlighted ? 0.95 : 0.7}
                    >
                      <animateMotion
                        dur={`${baseDuration}s`}
                        repeatCount="indefinite"
                        path={pathData}
                      />
                    </circle>
                  )}

                  {/* Secondary Staggered Particle for High-Throughput Paths */}
                  {flowSpeed > 0 && (isHighlighted || isAttackPath) && (
                    <circle
                      r="2.5"
                      fill={isAttackPath ? '#ffcc00' : '#ffffff'}
                      filter="url(#photon-particle-glow)"
                    >
                      <animateMotion
                        dur={`${baseDuration}s`}
                        begin={`${(Number(baseDuration) / 2).toFixed(2)}s`}
                        repeatCount="indefinite"
                        path={pathData}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* ── Nodes & Glowing Anchor Dots ────────────────── */}
          <g className="flow-nodes-layer">
            {NODES.map(node => {
              const stageConfig = STAGES.find(s => s.id === node.stage);
              const anchor = getNodeAnchor(node);
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isConnected = highlightedData.activeNodeIds.has(node.id);
              const isDimmed = (hoveredNodeId || selectedNodeId) && !isConnected && !isSelected;

              const pillWidth = 145;
              const pillHeight = 32;
              const pillX = node.x - pillWidth / 2;
              const pillY = node.y - pillHeight / 2;

              return (
                <g
                  key={node.id}
                  className={`flow-node-group ${isSelected ? 'active' : ''}`}
                  opacity={isDimmed ? 0.35 : 1}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  {/* Node Capsule Background */}
                  <rect
                    x={pillX}
                    y={pillY}
                    width={pillWidth}
                    height={pillHeight}
                    rx="16"
                    className="flow-pill-rect"
                    stroke={
                      isSelected
                        ? stageConfig?.color
                        : isHovered
                        ? '#fff'
                        : isConnected
                        ? stageConfig?.color
                        : 'rgba(255, 255, 255, 0.12)'
                    }
                    strokeWidth={isSelected ? 2 : isHovered ? 1.6 : 1}
                    filter={isSelected ? `drop-shadow(0 0 10px ${stageConfig?.glow})` : undefined}
                  />

                  {/* Icon Circle */}
                  <g transform={`translate(${pillX + 8}, ${pillY + 7})`}>
                    <circle cx="9" cy="9" r="9" fill="rgba(255,255,255,0.05)" />
                    <g transform="translate(2.5, 2.5)">
                      <NodeIcon type={node.icon} color={stageConfig?.color || '#fff'} />
                    </g>
                  </g>

                  {/* Node Title & Subtitle */}
                  <text x={pillX + 32} y={pillY + 14} className="flow-node-text">
                    {node.label}
                  </text>
                  <text x={pillX + 32} y={pillY + 24} className="flow-node-sub">
                    {node.sub}
                  </text>

                  {/* Anchor Connection Dot (Glowing Synapse Node) */}
                  <g transform={`translate(${anchor.x}, ${anchor.y})`}>
                    {/* Outer Radial Glow Halo */}
                    <circle
                      r={isSelected || isHovered ? 12 : 7}
                      fill={stageConfig?.color}
                      opacity={isSelected || isHovered ? 0.45 : 0.18}
                      className="flow-anchor-dot"
                    />

                    {/* Middle Pulse Ring */}
                    <circle
                      r={isSelected || isHovered ? 6 : 4.5}
                      fill={stageConfig?.color}
                      filter={`url(#glow-${node.stage === 'signals' ? 'amber' : node.stage === 'intelligence' ? 'pink' : node.stage === 'context' ? 'green' : 'cyan'})`}
                    />

                    {/* White Jewel Center Core */}
                    <circle r="1.8" fill="#ffffff" />
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Slide-Out Interactive Node Inspector HUD ────────── */}
        {selectedNode && (
          <div className="flow-node-hud">
            <div className="flow-hud-header">
              <span
                className="flow-hud-stage-tag"
                style={{
                  background: `${STAGES.find(s => s.id === selectedNode.stage)?.color}20`,
                  color: STAGES.find(s => s.id === selectedNode.stage)?.color,
                  border: `1px solid ${STAGES.find(s => s.id === selectedNode.stage)?.color}50`,
                }}
              >
                {selectedNode.stage.toUpperCase()} · {selectedNode.tag}
              </span>
              <button
                className="flow-hud-close"
                onClick={() => setSelectedNodeId(null)}
                title="Dismiss inspector"
              >
                ✕
              </button>
            </div>

            <div className="flow-hud-title">{selectedNode.label}</div>
            <div className="flow-hud-desc">{selectedNode.desc}</div>

            <div className="flow-hud-metrics-grid">
              <div className="flow-hud-metric-box">
                <div className="flow-hud-metric-label">Pipeline Metric</div>
                <div className="flow-hud-metric-value">{selectedNode.metric}</div>
              </div>
              <div className="flow-hud-metric-box">
                <div className="flow-hud-metric-label">Live Ingestion</div>
                <div className="flow-hud-metric-value" style={{ color: '#00e676' }}>
                  {bandwidth?.packets_per_sec ? `${bandwidth.packets_per_sec} pps` : 'Active'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.66rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Engine: </span>
              {selectedNode.tech}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Legend & Live Metrics ────────────────────── */}
      <div className="flow-footer-stats">
        <div className="flow-legend">
          {STAGES.map(s => (
            <div key={s.id} className="flow-legend-item">
              <span className="flow-legend-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <span>{s.num} {s.title}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
          <span>Nodes: <strong style={{ color: '#fff' }}>20</strong></span>
          <span>Synapses: <strong style={{ color: '#fff' }}>35</strong></span>
          <span>Flow Status: <strong style={{ color: '#00e676' }}>OPTICAL STREAMING</strong></span>
        </div>
      </div>
    </div>
  );
}
