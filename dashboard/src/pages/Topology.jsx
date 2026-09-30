import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { IconMonitor, IconActivity } from '../components/Icons';
import { useSocket } from '../hooks/useSocket';
import { getDevices, getTraffic } from '../api/http';
import * as mock from '../utils/mockData';

/* ================================================================
   LIVE NETWORK TOPOLOGY MAP
   ─────────────────────────
   Pure canvas-rendered network topology with animated packet
   particles flowing between nodes in real-time.
   
   - Nodes = discovered network devices, sized by total bandwidth
   - Edges = active traffic flows between endpoints
   - Particles = animated dots traveling along edges (live packets)
   - Click a node to inspect it, hover for quick info
   ================================================================ */

// ── Protocol → Color mapping (matches existing design system) ───
const PROTOCOL_COLORS = {
  TCP:   '#448aff',
  UDP:   '#b388ff',
  DNS:   '#00e676',
  HTTPS: '#00e676',
  HTTP:  '#f5a623',
  SSH:   '#ff3b3b',
  ICMP:  '#18ffff',
  ARP:   '#f5a623',
};

const NODE_TYPES = {
  gateway:     { label: 'Gateway',     baseColor: '#f5a623', baseRadius: 22 },
  server:      { label: 'Server',      baseColor: '#448aff', baseRadius: 18 },
  workstation: { label: 'Workstation', baseColor: '#00e676', baseRadius: 15 },
  iot:         { label: 'IoT Device',  baseColor: '#18ffff', baseRadius: 12 },
  external:    { label: 'External',    baseColor: '#b388ff', baseRadius: 14 },
  unknown:     { label: 'Unknown',     baseColor: '#7c7c92', baseRadius: 12 },
};

function classifyDevice(ip, device) {
  if (ip === '192.168.1.1' || ip === '10.0.0.1') return 'gateway';
  if (!ip.startsWith('192.168') && !ip.startsWith('10.0') && !ip.startsWith('172.')) return 'external';
  const totalBytes = (device?.total_bytes_sent || 0) + (device?.total_bytes_recv || 0);
  if (totalBytes > 200000000) return 'server';
  if (totalBytes < 10000000) return 'iot';
  return 'workstation';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── Force-directed layout engine ────────────────────────────────
function forceLayout(nodes, edges, width, height, iterations = 150) {
  const positions = new Map();
  const centerX = width / 2;
  const centerY = height / 2;
  const layoutRadius = Math.min(width, height) * 0.28;
  
  // Start positions: gateway in center, others in a circle
  const gatewayNodes = nodes.filter(n => n.type === 'gateway');
  const otherNodes = nodes.filter(n => n.type !== 'gateway');
  
  gatewayNodes.forEach(n => {
    positions.set(n.id, { x: centerX, y: centerY });
  });
  
  otherNodes.forEach((n, i) => {
    const angle = (i / otherNodes.length) * Math.PI * 2 - Math.PI / 2;
    const r = layoutRadius * (0.6 + Math.random() * 0.4);
    positions.set(n.id, {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
    });
  });

  // Build adjacency for spring forces
  const adjacency = new Map();
  edges.forEach(e => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    if (!adjacency.has(e.target)) adjacency.set(e.target, []);
    adjacency.get(e.source).push(e.target);
    adjacency.get(e.target).push(e.source);
  });

  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1)) * 0.5;
  
  for (let iter = 0; iter < iterations; iter++) {
    const temp = 0.1 * (1 - iter / iterations);
    const forces = new Map();
    nodes.forEach(n => forces.set(n.id, { x: 0, y: 0 }));

    // Repulsion (all pairs)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const pi = positions.get(nodes[i].id);
        const pj = positions.get(nodes[j].id);
        let dx = pi.x - pj.x;
        let dy = pi.y - pj.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(nodes[i].id).x += fx;
        forces.get(nodes[i].id).y += fy;
        forces.get(nodes[j].id).x -= fx;
        forces.get(nodes[j].id).y -= fy;
      }
    }

    // Attraction (connected edges)
    edges.forEach(e => {
      const ps = positions.get(e.source);
      const pt = positions.get(e.target);
      if (!ps || !pt) return;
      let dx = pt.x - ps.x;
      let dy = pt.y - ps.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist * dist) / k * 0.3;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      forces.get(e.source).x += fx;
      forces.get(e.source).y += fy;
      forces.get(e.target).x -= fx;
      forces.get(e.target).y -= fy;
    });

    // Gravity toward center
    nodes.forEach(n => {
      const p = positions.get(n.id);
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const gravityStrength = n.type === 'gateway' ? 0.12 : 0.06;
        forces.get(n.id).x += dx * gravityStrength;
        forces.get(n.id).y += dy * gravityStrength;
      }
    });

    // Apply forces
    nodes.forEach(n => {
      const f = forces.get(n.id);
      const p = positions.get(n.id);
      const mag = Math.sqrt(f.x * f.x + f.y * f.y);
      if (mag > 0) {
        const maxDisp = temp * k;
        const capped = Math.min(mag, maxDisp);
        p.x += (f.x / mag) * capped;
        p.y += (f.y / mag) * capped;
      }
      // Keep within bounds
      const margin = 50;
      p.x = Math.max(margin, Math.min(width - margin, p.x));
      p.y = Math.max(margin, Math.min(height - margin, p.y));
    });
  }

  return positions;
}


// ── Particle system ─────────────────────────────────────────────
class Particle {
  constructor(edge, speed, protocol) {
    this.edge = edge;
    this.progress = 0;
    this.speed = speed;
    this.protocol = protocol;
    this.color = PROTOCOL_COLORS[protocol] || '#f5a623';
    this.size = 2 + Math.random() * 1.5;
    this.opacity = 0.6 + Math.random() * 0.4;
  }

  update(dt) {
    this.progress += this.speed * dt;
    return this.progress < 1;
  }
}

// ── Main Component ──────────────────────────────────────────────

function IconTopology(props) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <line x1="12" y1="7.5" x2="5" y2="16.5" />
      <line x1="12" y1="7.5" x2="19" y2="16.5" />
      <line x1="7.5" y1="19" x2="16.5" y2="19" />
    </svg>
  );
}

export default function Topology() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const positionsRef = useRef(new Map());
  const hoveredNodeRef = useRef(null);
  const selectedNodeRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastFrameRef = useRef(performance.now());
  const spawnTimerRef = useRef(0);

  const [devices, setDevices] = useState(mock.generateDevices());
  const [flows, setFlows] = useState(mock.generateFlows(40));
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, packetsAnimated: 0 });
  const [paused, setPaused] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 560 });

  const { data: liveDevices } = useSocket('stats:devices');

  // Try real API, fall back to mock
  useEffect(() => {
    async function fetchData() {
      try {
        const [devRes, trafficRes] = await Promise.allSettled([
          getDevices({ limit: 200 }),
          getTraffic({ limit: 100 }),
        ]);
        if (devRes.status === 'fulfilled' && devRes.value?.data?.length > 0) setDevices(devRes.value.data);
        if (trafficRes.status === 'fulfilled' && trafficRes.value?.data?.length > 0) setFlows(trafficRes.value.data);
      } catch (e) { /* use mock */ }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (liveDevices?.length) setDevices(liveDevices); }, [liveDevices]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ w: Math.round(width), h: Math.round(height) });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build graph from devices + flows
  useEffect(() => {
    // Collect unique IPs
    const ipSet = new Set();
    devices.forEach(d => ipSet.add(d.ip));
    flows.forEach(f => { ipSet.add(f.src_ip); ipSet.add(f.dst_ip); });

    // Build device lookup
    const deviceMap = new Map();
    devices.forEach(d => deviceMap.set(d.ip, d));

    // Create nodes
    const nodeList = [...ipSet].map(ip => {
      const dev = deviceMap.get(ip);
      const type = classifyDevice(ip, dev);
      const totalBytes = dev ? (dev.total_bytes_sent || 0) + (dev.total_bytes_recv || 0) : 0;
      return {
        id: ip,
        label: ip,
        mac: dev?.mac_address || null,
        type,
        totalBytes,
        ...NODE_TYPES[type],
      };
    });

    // Limit to reasonable number of nodes (too many external IPs makes it messy)
    const localNodes = nodeList.filter(n => n.type !== 'external');
    const externalNodes = nodeList.filter(n => n.type === 'external').slice(0, 6);
    const finalNodes = [...localNodes, ...externalNodes];
    const finalNodeIds = new Set(finalNodes.map(n => n.id));

    // Build edges from flows (aggregate by src-dst pair)
    const edgeMap = new Map();
    flows.forEach(f => {
      if (!finalNodeIds.has(f.src_ip) || !finalNodeIds.has(f.dst_ip)) return;
      if (f.src_ip === f.dst_ip) return;
      const key = [f.src_ip, f.dst_ip].sort().join('|');
      if (!edgeMap.has(key)) {
        edgeMap.set(key, {
          source: f.src_ip,
          target: f.dst_ip,
          totalBytes: 0,
          packetCount: 0,
          protocols: {},
        });
      }
      const e = edgeMap.get(key);
      e.totalBytes += f.total_bytes || f.size || 0;
      e.packetCount += f.packet_count || 1;
      const proto = f.protocol || 'TCP';
      e.protocols[proto] = (e.protocols[proto] || 0) + (f.total_bytes || f.size || 0);
    });

    const edgeList = [...edgeMap.values()].map(e => {
      // Find dominant protocol
      const dominant = Object.entries(e.protocols).sort((a, b) => b[1] - a[1])[0];
      return { ...e, dominantProtocol: dominant ? dominant[0] : 'TCP' };
    });

    nodesRef.current = finalNodes;
    edgesRef.current = edgeList;

    // Compute layout
    const positions = forceLayout(finalNodes, edgeList, canvasSize.w, canvasSize.h);
    positionsRef.current = positions;

    setStats({ nodes: finalNodes.length, edges: edgeList.length, packetsAnimated: 0 });
  }, [devices, flows, canvasSize]);

  // ── Canvas animation loop ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    ctx.scale(dpr, dpr);

    let totalPacketsAnimated = 0;

    function render(now) {
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;

      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const positions = positionsRef.current;
      const hovered = hoveredNodeRef.current;
      const selected = selectedNodeRef.current;

      if (nodes.length === 0) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      // Spawn new particles
      if (!paused) {
        spawnTimerRef.current += dt;
        const spawnInterval = 0.06; // ~16 particles/sec
        while (spawnTimerRef.current >= spawnInterval && edges.length > 0) {
          spawnTimerRef.current -= spawnInterval;
          const edge = edges[Math.floor(Math.random() * edges.length)];
          const protocols = Object.keys(edge.protocols);
          const proto = protocols[Math.floor(Math.random() * protocols.length)] || 'TCP';
          const speed = 0.3 + Math.random() * 0.5;
          particlesRef.current.push(new Particle(edge, speed, proto));
          totalPacketsAnimated++;
        }
      }

      // Update particles
      particlesRef.current = particlesRef.current.filter(p => p.update(dt));

      // Draw edges
      edges.forEach(edge => {
        const s = positions.get(edge.source);
        const t = positions.get(edge.target);
        if (!s || !t) return;

        const isHighlighted = hovered === edge.source || hovered === edge.target ||
                              selected === edge.source || selected === edge.target;

        const maxBytes = Math.max(...edges.map(e => e.totalBytes), 1);
        const thickness = 0.5 + (edge.totalBytes / maxBytes) * 2.5;
        const color = PROTOCOL_COLORS[edge.dominantProtocol] || '#f5a623';

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHighlighted
          ? color + 'AA'
          : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = isHighlighted ? thickness + 0.5 : thickness;
        ctx.stroke();
      });

      // Draw particles
      particlesRef.current.forEach(p => {
        const s = positions.get(p.edge.source);
        const t = positions.get(p.edge.target);
        if (!s || !t) return;

        const x = s.x + (t.x - s.x) * p.progress;
        const y = s.y + (t.y - s.y) * p.progress;

        // Glow effect
        ctx.beginPath();
        ctx.arc(x, y, p.size + 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '18';
        ctx.fill();

        // Particle
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * (1 - Math.abs(p.progress - 0.5) * 0.3);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw nodes
      nodes.forEach(node => {
        const pos = positions.get(node.id);
        if (!pos) return;

        const isHovered = hovered === node.id;
        const isSelected = selected === node.id;
        const maxBytes = Math.max(...nodes.map(n => n.totalBytes), 1);
        const sizeScale = 0.7 + (node.totalBytes / maxBytes) * 0.6;
        const radius = node.baseRadius * sizeScale;

        // Node ring (always visible for gateway/server, hover for others)
        const showRing = isSelected || isHovered || node.type === 'gateway';
        if (showRing) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected
            ? node.baseColor
            : isHovered ? node.baseColor + '80' : node.baseColor + '30';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Node fill
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        const fillAlpha = isHovered || isSelected ? '28' : '14';
        ctx.fillStyle = node.baseColor + fillAlpha;
        ctx.fill();
        ctx.strokeStyle = node.baseColor + (isHovered || isSelected ? 'AA' : '50');
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Node inner dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = node.baseColor;
        ctx.fill();

        // Type label (always shown)
        ctx.font = '700 7px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = node.baseColor + (isHovered || isSelected ? '' : '90');
        ctx.fillText(NODE_TYPES[node.type].label.toUpperCase(), pos.x, pos.y + radius + 5);

        // IP label
        ctx.font = '500 8px "JetBrains Mono", monospace';
        ctx.fillStyle = isHovered || isSelected ? '#e2e2e8' : '#4a4a5e';
        ctx.fillText(node.label, pos.x, pos.y + radius + 16);
      });

      // Update stats periodically
      if (totalPacketsAnimated % 50 === 0) {
        setStats(prev => ({ ...prev, packetsAnimated: totalPacketsAnimated }));
      }

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [canvasSize, paused]);

  // ── Mouse interaction ─────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y };

    const nodes = nodesRef.current;
    const positions = positionsRef.current;
    let found = null;

    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const dx = pos.x - x;
      const dy = pos.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < node.baseRadius + 8) {
        found = node.id;
        break;
      }
    }
    hoveredNodeRef.current = found;
    canvas.style.cursor = found ? 'pointer' : 'default';
  }, []);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodes = nodesRef.current;
    const positions = positionsRef.current;
    let found = null;

    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const dx = pos.x - x;
      const dy = pos.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < node.baseRadius + 8) {
        found = node;
        break;
      }
    }

    if (found) {
      selectedNodeRef.current = found.id;
      setSelectedNode(found);
    } else {
      selectedNodeRef.current = null;
      setSelectedNode(null);
    }
  }, []);

  // Get selected node details
  const selectedDeviceInfo = useMemo(() => {
    if (!selectedNode) return null;
    const dev = devices.find(d => d.ip === selectedNode.id);
    const connectedEdges = edgesRef.current.filter(
      e => e.source === selectedNode.id || e.target === selectedNode.id
    );
    const totalTraffic = connectedEdges.reduce((s, e) => s + e.totalBytes, 0);
    const protocols = {};
    connectedEdges.forEach(e => {
      Object.entries(e.protocols).forEach(([proto, bytes]) => {
        protocols[proto] = (protocols[proto] || 0) + bytes;
      });
    });
    const connectedNodes = new Set();
    connectedEdges.forEach(e => {
      connectedNodes.add(e.source === selectedNode.id ? e.target : e.source);
    });

    return {
      ...selectedNode,
      mac: dev?.mac_address || 'Unknown',
      totalBytesSent: dev?.total_bytes_sent || 0,
      totalBytesRecv: dev?.total_bytes_recv || 0,
      connections: connectedNodes.size,
      totalTraffic,
      protocols: Object.entries(protocols).sort((a, b) => b[1] - a[1]),
      firstSeen: dev?.first_seen || null,
      lastSeen: dev?.last_seen || null,
    };
  }, [selectedNode, devices]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><IconTopology /></span>
            Network Topology
          </h1>
          <p className="page-subtitle">Live network map with animated packet flows</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${paused ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'RESUME' : '● LIVE'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 14,
        fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{stats.nodes}</span> nodes</span>
        <span><span style={{ color: 'var(--blue)', fontWeight: 700 }}>{stats.edges}</span> connections</span>
        <span><span style={{ color: 'var(--green)', fontWeight: 700 }}>{stats.packetsAnimated}</span> packets animated</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {Object.entries(PROTOCOL_COLORS).slice(0, 6).map(([proto, color]) => (
            <span key={proto} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {proto}
            </span>
          ))}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          className="card"
          style={{
            flex: 1, padding: 0, overflow: 'hidden',
            minHeight: 560, position: 'relative',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{
              width: '100%', height: '100%',
              display: 'block',
            }}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
          />

          {/* Empty state */}
          {nodesRef.current.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: '0.82rem',
            }}>
              <div className="loading-spinner" style={{ marginBottom: 12 }} />
              Building topology...
            </div>
          )}
        </div>

        {/* Inspector panel */}
        {selectedDeviceInfo && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="card"
            style={{ width: 280, flexShrink: 0, padding: 16 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14,
            }}>
              <div style={{
                fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: selectedDeviceInfo.baseColor,
                fontFamily: 'var(--font-mono)',
              }}>
                {NODE_TYPES[selectedDeviceInfo.type]?.label || 'Device'}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { selectedNodeRef.current = null; setSelectedNode(null); }}
                style={{ padding: '2px 6px', fontSize: '0.6rem' }}
              >
                CLOSE
              </button>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '1rem',
              fontWeight: 700, marginBottom: 4,
            }}>
              {selectedDeviceInfo.id}
            </div>

            {selectedDeviceInfo.mac && (
              <div style={{
                fontSize: '0.68rem', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', marginBottom: 16,
              }}>
                {selectedDeviceInfo.mac}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'CONNECTIONS', value: selectedDeviceInfo.connections },
                { label: 'TRAFFIC VOLUME', value: formatBytes(selectedDeviceInfo.totalTraffic) },
                { label: 'SENT', value: formatBytes(selectedDeviceInfo.totalBytesSent) },
                { label: 'RECEIVED', value: formatBytes(selectedDeviceInfo.totalBytesRecv) },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 4,
                }}>
                  <div style={{
                    fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.88rem',
                    fontWeight: 700,
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Protocol breakdown */}
            {selectedDeviceInfo.protocols.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8,
                }}>
                  PROTOCOL BREAKDOWN
                </div>
                {selectedDeviceInfo.protocols.map(([proto, bytes]) => {
                  const pct = selectedDeviceInfo.totalTraffic > 0
                    ? (bytes / selectedDeviceInfo.totalTraffic * 100).toFixed(0) : 0;
                  return (
                    <div key={proto} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 4, fontSize: '0.72rem',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: PROTOCOL_COLORS[proto] || '#7c7c92',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: PROTOCOL_COLORS[proto] || 'var(--text-secondary)',
                        minWidth: 40,
                      }}>
                        {proto}
                      </span>
                      <div style={{
                        flex: 1, height: 3, background: 'rgba(255,255,255,0.06)',
                        borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: PROTOCOL_COLORS[proto] || '#f5a623',
                          borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                        color: 'var(--text-muted)', minWidth: 30, textAlign: 'right',
                      }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Timestamps */}
            {selectedDeviceInfo.firstSeen && (
              <div style={{
                marginTop: 14, paddingTop: 10,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.62rem', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                <div style={{ marginBottom: 3 }}>
                  FIRST SEEN {new Date(selectedDeviceInfo.firstSeen).toLocaleTimeString()}
                </div>
                <div>
                  LAST SEEN {new Date(selectedDeviceInfo.lastSeen).toLocaleTimeString()}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
