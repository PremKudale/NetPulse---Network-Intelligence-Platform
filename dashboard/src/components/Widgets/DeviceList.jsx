import { useState, useMemo } from 'react';

/* ================================================================
   ENTERPRISE DEVICE LIST — v2
   ───────────────────────────
   Rich tactical device browser with:
   • Search by IP, hostname, vendor, MAC, or role
   • Role filtering (Gateway, Workstation, Server, Mobile, IoT)
   • Sorting options (Total traffic, TX, RX, Activity)
   • Device identity cards with vendor badges, MAC, dual TX/RX meters
   • Responsive grid or dense view
   ================================================================ */

// ── Fallback Enterprise Metadata (matches sniffer.py & mockData.js) ──
const KNOWN_METADATA = {
  '192.168.1.1':   { hostname: 'gw-core-01',         role: 'gateway',     vendor: 'Cisco',     mac: '3C:37:86:5D:E4:01' },
  '192.168.1.101': { hostname: 'ws-dev-anand',       role: 'workstation', vendor: 'Dell',      mac: 'F0:18:98:3A:B2:10' },
  '192.168.1.102': { hostname: 'ws-dev-priya',       role: 'workstation', vendor: 'Lenovo',    mac: 'A4:83:E7:22:CD:11' },
  '192.168.1.103': { hostname: 'ws-design-rahul',    role: 'workstation', vendor: 'Apple',     mac: '98:FA:9B:45:1E:12' },
  '192.168.1.104': { hostname: 'ws-mgmt-sneha',      role: 'workstation', vendor: 'HP',        mac: 'BC:D0:74:58:9F:13' },
  '192.168.1.105': { hostname: 'ws-sales-vikram',    role: 'workstation', vendor: 'Dell',      mac: '48:2C:A0:6B:D3:14' },
  '192.168.1.106': { hostname: 'ws-hr-meera',        role: 'workstation', vendor: 'Lenovo',    mac: '70:5A:0F:7C:E8:15' },
  '192.168.1.107': { hostname: 'ws-finance-arjun',   role: 'workstation', vendor: 'Dell',      mac: 'DC:A6:32:8D:F1:16' },
  '192.168.1.10':  { hostname: 'srv-app-01',         role: 'server',      vendor: 'VMware',    mac: '00:50:56:A1:23:20' },
  '192.168.1.11':  { hostname: 'srv-db-01',          role: 'server',      vendor: 'VMware',    mac: '00:50:56:A1:23:21' },
  '192.168.1.12':  { hostname: 'srv-file-01',        role: 'server',      vendor: 'VMware',    mac: '00:50:56:A1:23:22' },
  '192.168.1.13':  { hostname: 'srv-mail-01',        role: 'server',      vendor: 'VMware',    mac: '00:50:56:A1:23:23' },
  '192.168.1.150': { hostname: 'mob-iphone-priya',   role: 'mobile',      vendor: 'Apple',     mac: '8C:85:90:AB:12:30' },
  '192.168.1.151': { hostname: 'mob-pixel-anand',    role: 'mobile',      vendor: 'Google',    mac: '34:14:B5:CD:34:31' },
  '192.168.1.152': { hostname: 'laptop-vikram-wifi', role: 'mobile',      vendor: 'Dell',      mac: 'E8:6F:38:EF:56:32' },
  '192.168.1.200': { hostname: 'printer-hp-3f',      role: 'iot',         vendor: 'HP',        mac: '00:17:C5:12:78:40' },
  '192.168.1.201': { hostname: 'cam-lobby-01',       role: 'iot',         vendor: 'Hikvision', mac: '7C:2F:80:23:89:41' },
  '192.168.1.202': { hostname: 'cam-server-room',    role: 'iot',         vendor: 'Hikvision', mac: '7C:2F:80:34:9A:42' },
  '192.168.1.203': { hostname: 'voip-lobby',         role: 'iot',         vendor: 'Polycom',   mac: 'B0:CE:18:45:AB:43' },
  '192.168.1.204': { hostname: 'ap-wifi-3f',         role: 'iot',         vendor: 'Ubiquiti',  mac: '44:07:0B:56:BC:44' },
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

// ── SVG Role Icons ──────────────────────────────────────────
function RoleIcon({ role, style }) {
  const iconProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { width: 14, height: 14, ...style },
  };

  switch (role) {
    case 'server':
      return (
        <svg {...iconProps}>
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
    case 'gateway':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'mobile':
      return (
        <svg {...iconProps}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    case 'iot':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default: // workstation
      return (
        <svg {...iconProps}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
  }
}

const ROLE_COLORS = {
  gateway:     { bg: 'rgba(245,166,35,0.12)', fg: '#f5a623' },
  server:      { bg: 'rgba(68,138,255,0.12)', fg: '#448aff' },
  workstation: { bg: 'rgba(0,230,118,0.12)', fg: '#00e676' },
  mobile:      { bg: 'rgba(179,136,255,0.12)',fg: '#b388ff' },
  iot:         { bg: 'rgba(24,255,255,0.12)', fg: '#18ffff' },
};

export default function DeviceList({ devices = [], maxItems = 50 }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('total');

  // Enrich devices with known enterprise metadata if missing
  const enriched = useMemo(() => {
    return devices.map(d => {
      const meta = KNOWN_METADATA[d.ip] || {};
      const hostname = d.hostname || meta.hostname || `host-${d.ip.split('.').pop()}`;
      const role = (d.role || meta.role || 'workstation').toLowerCase();
      const vendor = d.vendor || meta.vendor || 'Generic OEM';
      const mac = d.mac || meta.mac || '02:00:00:00:00:00';
      const tx = d.total_bytes_sent || d.bytes_sent || 0;
      const rx = d.total_bytes_recv || d.bytes_recv || 0;
      const total = tx + rx;
      const isOnline = d.last_seen
        ? (Date.now() - new Date(d.last_seen).getTime()) < 300000
        : true;

      return {
        ...d,
        hostname,
        role,
        vendor,
        mac,
        tx,
        rx,
        total,
        isOnline,
      };
    });
  }, [devices]);

  // Filter & Search
  const filtered = useMemo(() => {
    return enriched.filter(d => {
      if (roleFilter !== 'ALL' && d.role !== roleFilter.toLowerCase()) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.ip.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q) ||
        d.mac.toLowerCase().includes(q) ||
        d.role.toLowerCase().includes(q)
      );
    });
  }, [enriched, roleFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'tx') return b.tx - a.tx;
      if (sortBy === 'rx') return b.rx - a.rx;
      if (sortBy === 'ip') return a.ip.localeCompare(b.ip, undefined, { numeric: true });
      return b.total - a.total; // 'total'
    }).slice(0, maxItems);
  }, [filtered, sortBy, maxItems]);

  const maxTotal = useMemo(() => {
    return Math.max(...sorted.map(d => d.total), 1);
  }, [sorted]);

  if (enriched.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">—</div>
        <div className="empty-state-title">No devices detected</div>
        <div className="empty-state-text">Start the capture engine to discover devices</div>
      </div>
    );
  }

  const roles = ['ALL', 'GATEWAY', 'SERVER', 'WORKSTATION', 'MOBILE', 'IOT'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Toolbar: Search, Filter, Sort ─────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 10, padding: '4px 0',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Search IP, host, vendor, MAC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Role Pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {roles.map(r => {
            const active = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{
                  background: active ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                  color: active ? 'var(--bg-primary)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  borderRadius: 3,
                  padding: '3px 8px',
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>SORT:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="total">TOTAL TRAFFIC</option>
            <option value="tx">OUTBOUND (TX)</option>
            <option value="rx">INBOUND (RX)</option>
            <option value="ip">IP ADDRESS</option>
          </select>
        </div>
      </div>

      {/* ── Device Cards Grid ─────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 12,
      }}>
        {sorted.map((device, i) => {
          const roleTheme = ROLE_COLORS[device.role] || ROLE_COLORS.workstation;
          const totalPct = (device.total / maxTotal) * 100;
          const txPct = device.total > 0 ? (device.tx / device.total) * 100 : 50;

          return (
            <div
              key={device.ip || i}
              style={{
                background: 'rgba(20, 20, 24, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 5,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.3)';
                e.currentTarget.style.background = 'rgba(28, 28, 34, 0.85)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.background = 'rgba(20, 20, 24, 0.65)';
              }}
            >
              {/* Header: Status, Hostname, Role Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 4,
                    background: roleTheme.bg, color: roleTheme.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <RoleIcon role={device.role} />
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)',
                      lineHeight: 1.2, letterSpacing: '-0.01em',
                    }}>
                      {device.hostname}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                      color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span className={`status-dot ${device.isOnline ? 'online' : 'warning'}`} style={{ width: 5, height: 5 }} />
                      <span>{device.ip}</span>
                    </div>
                  </div>
                </div>

                {/* Role Pill */}
                <span style={{
                  fontSize: '0.52rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 2,
                  background: roleTheme.bg, color: roleTheme.fg, textTransform: 'uppercase',
                }}>
                  {device.role}
                </span>
              </div>

              {/* Hardware & Identity Row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                background: 'rgba(0,0,0,0.25)', padding: '4px 8px', borderRadius: 3,
              }}>
                <span>VENDOR: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{device.vendor}</span></span>
                <span>MAC: <span style={{ color: 'var(--text-secondary)' }}>{device.mac}</span></span>
              </div>

              {/* Traffic Bars & Stats */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    TOTAL BANDWIDTH
                  </span>
                  <span style={{
                    fontSize: '0.74rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)',
                  }}>
                    {formatBytes(device.total)}
                  </span>
                </div>

                {/* Relative Volume Bar */}
                <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${totalPct}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent-bright))',
                    borderRadius: 2, transition: 'width 0.4s ease',
                  }} />
                </div>

                {/* TX / RX Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.58rem', fontFamily: 'var(--font-mono)',
                    background: 'rgba(68,138,255,0.06)', padding: '3px 6px', borderRadius: 2,
                  }}>
                    <span style={{ color: '#448aff', fontWeight: 700 }}>TX ↑</span>
                    <span style={{ color: '#e2e2e8' }}>{formatBytes(device.tx)}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.58rem', fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,230,118,0.06)', padding: '3px 6px', borderRadius: 2,
                  }}>
                    <span style={{ color: '#00e676', fontWeight: 700 }}>RX ↓</span>
                    <span style={{ color: '#e2e2e8' }}>{formatBytes(device.rx)}</span>
                  </div>
                </div>
              </div>

              {/* Footer info: Last active */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end',
                fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              }}>
                <span>ACTIVE: {timeAgo(device.last_seen)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          No devices matched your filter criteria
        </div>
      )}
    </div>
  );
}
