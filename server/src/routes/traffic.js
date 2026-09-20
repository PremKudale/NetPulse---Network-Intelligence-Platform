const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run, transaction, getDb } = require('../db');

// GET /api/traffic — Paginated packet records with filters
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, src_ip, dst_ip, protocol, src_port, dst_port, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (src_ip) { conditions.push('src_ip = ?'); params.push(src_ip); }
    if (dst_ip) { conditions.push('dst_ip = ?'); params.push(dst_ip); }
    if (protocol) { conditions.push('protocol = ?'); params.push(protocol.toUpperCase()); }
    if (src_port) { conditions.push('src_port = ?'); params.push(parseInt(src_port)); }
    if (dst_port) { conditions.push('dst_port = ?'); params.push(parseInt(dst_port)); }
    if (start_date) { conditions.push('timestamp >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('timestamp <= ?'); params.push(end_date); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = queryOne(`SELECT COUNT(*) as total FROM packets ${where}`, params);
    const total = countRow?.total || 0;

    const rows = queryAll(
      `SELECT * FROM packets ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('[Traffic] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
});

// GET /api/traffic/flows
router.get('/flows', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const rows = queryAll('SELECT * FROM flows ORDER BY total_bytes DESC LIMIT ?', [parseInt(limit)]);
    res.json({ data: rows });
  } catch (err) {
    console.error('[Traffic] GET /flows error:', err.message);
    res.status(500).json({ error: 'Failed to fetch flow data' });
  }
});

// POST /api/traffic/ingest — Receive live data from Python capture engine
router.post('/ingest', (req, res) => {
  try {
    const { packets, flows, stats, anomalies } = req.body;
    const io = req.app.get('io');

    transaction(() => {
      // Insert packets
      if (packets?.length > 0) {
        const stmt = getDb().prepare(
          `INSERT INTO packets (timestamp, src_ip, dst_ip, protocol, src_port, dst_port, size, ttl, flags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const p of packets.slice(0, 500)) {
          stmt.run(p.timestamp || new Date().toISOString(), p.src_ip, p.dst_ip, p.protocol,
            p.src_port || null, p.dst_port || null, p.size || 0, p.ttl || null, p.flags || null);
        }
      }

      // Upsert flows
      if (flows?.length > 0) {
        const stmt = getDb().prepare(
          `INSERT INTO flows (src_ip, dst_ip, protocol, src_port, dst_port, total_bytes, packet_count, first_seen, last_seen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(src_ip, dst_ip, protocol, src_port, dst_port) DO UPDATE SET
             total_bytes = flows.total_bytes + excluded.total_bytes,
             packet_count = flows.packet_count + excluded.packet_count,
             last_seen = excluded.last_seen`
        );
        for (const f of flows) {
          stmt.run(f.src_ip, f.dst_ip, f.protocol, f.src_port || 0, f.dst_port || 0,
            f.total_bytes, f.packet_count, f.first_seen || new Date().toISOString(), f.last_seen || new Date().toISOString());
        }
      }

      // Insert anomalies
      if (anomalies?.length > 0) {
        const stmt = getDb().prepare(
          `INSERT INTO anomalies (type, severity, title, description, src_ip, dst_ip, protocol, port, value, threshold)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const a of anomalies) {
          const result = stmt.run(a.type, a.severity, a.title, a.description,
            a.src_ip || null, a.dst_ip || null, a.protocol || null, a.port || null,
            a.value || null, a.threshold || null);
          if (io) {
            io.emit('anomaly:new', { ...a, id: result.lastInsertRowid });
          }
        }
      }
    });

    // Broadcast live stats
    if (io && stats) {
      if (stats.bandwidth) io.emit('stats:bandwidth', stats.bandwidth);
      if (stats.protocols) io.emit('stats:protocols', stats.protocols);
      if (stats.devices) io.emit('stats:devices', stats.devices);
      if (stats.summary) io.emit('stats:summary', stats.summary);
      if (packets) io.emit('traffic:live', packets.slice(0, 20));
    }

    res.json({ success: true, ingested: { packets: packets?.length || 0, flows: flows?.length || 0, anomalies: anomalies?.length || 0 } });
  } catch (err) {
    console.error('[Traffic] POST /ingest error:', err.message);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
});

module.exports = router;
