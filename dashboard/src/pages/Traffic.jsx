import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TrafficTable from '../components/Tables/TrafficTable';
import { IconList, IconRadio } from '../components/Icons';
import { useSocketFeed } from '../hooks/useSocket';
import { getTraffic } from '../api/http';
import * as mock from '../utils/mockData';

export default function Traffic() {
  const [packets, setPackets] = useState(mock.generatePackets(50));
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 2847, totalPages: 57 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ protocol: '', src_ip: '', dst_ip: '' });
  const [isLive, setIsLive] = useState(false);
  const { items: livePackets } = useSocketFeed('traffic:live', 100);

  useEffect(() => {
    if (isLive) return;
    async function fetch() {
      setLoading(true);
      try {
        const params = { page, limit: 50 };
        if (filters.protocol) params.protocol = filters.protocol;
        if (filters.src_ip) params.src_ip = filters.src_ip;
        if (filters.dst_ip) params.dst_ip = filters.dst_ip;
        const res = await getTraffic(params);
        if (res.data?.length > 0) {
          setPackets(res.data);
          setPagination(res.pagination || null);
        }
      } catch (e) { /* keep mock */ }
      setLoading(false);
    }
    fetch();
  }, [page, filters, isLive]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon"><IconList /></span>Traffic Records</h1>
          <p className="page-subtitle">Detailed packet capture log</p>
        </div>
        <button className={`btn ${isLive ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsLive(!isLive)}>
          {isLive ? '● LIVE MODE' : 'ENABLE LIVE'}
        </button>
      </div>
      {!isLive && (
        <div className="filter-bar">
          <select className="filter-select" value={filters.protocol} onChange={e => { setFilters(f => ({ ...f, protocol: e.target.value })); setPage(1); }}>
            <option value="">All Protocols</option>
            {['TCP', 'UDP', 'ICMP', 'DNS', 'ARP', 'HTTP', 'HTTPS', 'SSH'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="filter-input" placeholder="Source IP" value={filters.src_ip} onChange={e => { setFilters(f => ({ ...f, src_ip: e.target.value })); setPage(1); }} />
          <input className="filter-input" placeholder="Destination IP" value={filters.dst_ip} onChange={e => { setFilters(f => ({ ...f, dst_ip: e.target.value })); setPage(1); }} />
          {(filters.protocol || filters.src_ip || filters.dst_ip) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ protocol: '', src_ip: '', dst_ip: '' }); setPage(1); }}>CLEAR</button>
          )}
        </div>
      )}
      <div className="card">
        {isLive && (
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon"><IconRadio style={{ width: 14, height: 14 }} /></span>Live Packet Stream</span>
            <span className="card-badge live">● {livePackets.length} PACKETS</span>
          </div>
        )}
        <TrafficTable packets={isLive ? livePackets : packets} pagination={isLive ? null : pagination} onPageChange={setPage} loading={false} />
      </div>
    </motion.div>
  );
}
