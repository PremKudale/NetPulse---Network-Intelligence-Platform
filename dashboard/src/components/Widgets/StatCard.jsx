import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

function useCountUp(target, duration = 500) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = target;
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

export default function StatCard({ icon: Icon, label, value, unit = '', trend, trendLabel, color = 'amber' }) {
  const numericValue = typeof value === 'number' ? value : 0;
  const displayValue = typeof value === 'string' ? value : useCountUp(numericValue);

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <div className={`stat-card-icon ${color}`}>
            <Icon style={{ width: 15, height: 15 }} />
          </div>
        )}
      </div>
      <div className="stat-card-value">
        {typeof value === 'string' ? value : displayValue.toLocaleString()}
        {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 3 }}>{unit}</span>}
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className={`stat-card-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}`}>
          <span style={{ fontSize: '0.65rem' }}>{trend > 0 ? '▲' : trend < 0 ? '▼' : '—'}</span>
          <span>{trendLabel || `${Math.abs(trend || 0)}%`}</span>
        </div>
      )}
    </motion.div>
  );
}
