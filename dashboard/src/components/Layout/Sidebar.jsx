import { NavLink } from 'react-router-dom';
import { useSocketStatus } from '../../hooks/useSocket';
import { IconBarChart, IconMonitor, IconList, IconLayers, IconAlertTriangle, IconClock } from '../Icons';

function IconHome(props) {
  return <svg className="icon" viewBox="0 0 24 24" {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}

function IconFlow(props) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M8.5 6h2.5a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h1" />
      <path d="M8.5 18h2.5a3 3 0 0 0 3-3" />
    </svg>
  );
}

const navItems = [
  { to: '/', icon: IconHome, label: 'Overview' },
  { to: '/dashboard', icon: IconBarChart, label: 'Dashboard' },
  { to: '/pipeline', icon: IconFlow, label: 'Pipeline Flow' },
  { to: '/devices', icon: IconMonitor, label: 'Devices' },
  { to: '/traffic', icon: IconList, label: 'Traffic' },
  { to: '/protocols', icon: IconLayers, label: 'Protocols' },
  { to: '/anomalies', icon: IconAlertTriangle, label: 'Anomalies' },
  { to: '/historical', icon: IconClock, label: 'Historical' },
];

export default function Sidebar() {
  const { isConnected } = useSocketStatus();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">NP</div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">NETPULSE</div>
          <div className="sidebar-brand-version">SYS 2026</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={item.to === '/' || item.to === '/dashboard'}
          >
            <span className="sidebar-link-icon"><item.icon /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <div className="sidebar-section-label" style={{ padding: '0 0 6px 0' }}>System</div>
        <div className="sidebar-status-item">
          <span><span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />WebSocket</span>
          <span style={{ color: isConnected ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>
        <div className="sidebar-status-item">
          <span><span className="status-dot online" />API Server</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>:3001</span>
        </div>
        <div className="sidebar-status-item">
          <span><span className="status-dot online" />Database</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>SQLite</span>
        </div>
      </div>
    </aside>
  );
}
