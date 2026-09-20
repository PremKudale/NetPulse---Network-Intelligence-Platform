const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db');

// GET /api/devices
router.get('/', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const rows = queryAll(
      `SELECT *, (total_bytes_sent + total_bytes_recv) as total_bytes
       FROM device_stats ORDER BY (total_bytes_sent + total_bytes_recv) DESC LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[Devices] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/devices/top
router.get('/top', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const rows = queryAll(
      `SELECT *, (total_bytes_sent + total_bytes_recv) as total_bytes
       FROM device_stats ORDER BY (total_bytes_sent + total_bytes_recv) DESC LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[Devices] GET /top error:', err.message);
    res.status(500).json({ error: 'Failed to fetch top devices' });
  }
});

// GET /api/devices/:ip
router.get('/:ip', (req, res) => {
  try {
    const { ip } = req.params;
    const device = queryOne(
      `SELECT *, (total_bytes_sent + total_bytes_recv) as total_bytes FROM device_stats WHERE ip = ?`, [ip]
    );
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const flows = queryAll('SELECT * FROM flows WHERE src_ip = ? OR dst_ip = ? ORDER BY total_bytes DESC LIMIT 20', [ip, ip]);
    const recent_packets = queryAll('SELECT * FROM packets WHERE src_ip = ? OR dst_ip = ? ORDER BY timestamp DESC LIMIT 50', [ip, ip]);
    const protocols = queryAll(
      `SELECT protocol, COUNT(*) as packet_count, COALESCE(SUM(size), 0) as total_bytes
       FROM packets WHERE src_ip = ? OR dst_ip = ? GROUP BY protocol ORDER BY total_bytes DESC`, [ip, ip]
    );

    res.json({ device, flows, recent_packets, protocols });
  } catch (err) {
    console.error('[Devices] GET /:ip error:', err.message);
    res.status(500).json({ error: 'Failed to fetch device details' });
  }
});

module.exports = router;
