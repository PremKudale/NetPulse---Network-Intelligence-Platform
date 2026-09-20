import { useSocketStatus } from '../../hooks/useSocket';
import { useSocket } from '../../hooks/useSocket';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Topbar() {
  const { isConnected, latency } = useSocketStatus();
  const { data: bandwidth } = useSocket('stats:bandwidth', { bytes_per_sec: 0, packets_per_sec: 0 });

  const pipelineSteps = [
    { num: '1', label: 'CAPTURE' },
    { num: '2', label: 'ANALYZE' },
    { num: '3', label: 'STORE' },
    { num: '4', label: 'VISUALIZE' },
  ];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-pipeline">
          {pipelineSteps.map((step, i) => (
            <span key={step.num}>
              <span className={`pipeline-step ${isConnected ? 'active' : ''}`}>
                <span className="pipeline-step-number">{step.num}.</span>
                {step.label}
              </span>
              {i < pipelineSteps.length - 1 && (
                <span className="pipeline-arrow"> → </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-stat">
          <span className="topbar-stat-label">Bandwidth</span>
          <span className="topbar-stat-value">
            {formatBytes(bandwidth?.bytes_per_sec || 0)}/s
          </span>
        </div>

        <div className="topbar-stat">
          <span className="topbar-stat-label">PPS</span>
          <span className="topbar-stat-value">
            {bandwidth?.packets_per_sec || 0}
          </span>
        </div>

        {latency !== null && (
          <div className="topbar-stat">
            <span className="topbar-stat-label">Latency</span>
            <span className="topbar-stat-value" style={{ color: latency < 50 ? 'var(--green)' : latency < 200 ? 'var(--accent)' : 'var(--red)' }}>
              {latency}ms
            </span>
          </div>
        )}

        <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>
    </header>
  );
}
