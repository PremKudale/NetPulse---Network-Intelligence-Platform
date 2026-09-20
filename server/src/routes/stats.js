const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db');

// GET /api/stats/summary
router.get('/summary', (req, res) => {
  try {
    const devices = queryOne(
      `SELECT COUNT(*) as total_devices,
              SUM(CASE WHEN last_seen > datetime('now', '-5 minutes') THEN 1 ELSE 0 END) as active_devices
       FROM device_stats`
    ) || { total_devices: 0, active_devices: 0 };

    const traffic = queryOne(
      `SELECT COUNT(*) as total_packets, COALESCE(SUM(size), 0) as total_bytes FROM packets`
    ) || { total_packets: 0, total_bytes: 0 };

    const bandwidth = queryOne(
      'SELECT bytes_per_sec, packets_per_sec FROM bandwidth_history ORDER BY timestamp DESC LIMIT 1'
    ) || { bytes_per_sec: 0, packets_per_sec: 0 };

    const anomalyRow = queryOne(
      `SELECT COUNT(*) as active_anomalies,
              SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count
       FROM anomalies WHERE resolved = 0`
    ) || { active_anomalies: 0, critical_count: 0 };

    const topProto = queryOne(
      'SELECT protocol FROM protocol_stats ORDER BY timestamp DESC, byte_count DESC LIMIT 1'
    );

    res.json({
      total_devices: devices.total_devices || 0,
      active_devices: devices.active_devices || 0,
      total_packets: traffic.total_packets || 0,
      total_bytes: traffic.total_bytes || 0,
      current_bandwidth_bps: bandwidth.bytes_per_sec || 0,
      current_packets_per_sec: bandwidth.packets_per_sec || 0,
      active_anomalies: anomalyRow.active_anomalies || 0,
      critical_anomalies: anomalyRow.critical_count || 0,
      top_protocol: topProto?.protocol || 'N/A'
    });
  } catch (err) {
    console.error('[Stats] GET /summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/stats/bandwidth
router.get('/bandwidth', (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const rows = queryAll(
      `SELECT timestamp as time, bytes_per_sec, packets_per_sec, active_devices
       FROM bandwidth_history
       WHERE timestamp > datetime('now', '-' || ? || ' hours')
       ORDER BY timestamp ASC`,
      [parseInt(hours)]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[Stats] GET /bandwidth error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bandwidth data' });
  }
});

// GET /api/stats/protocols
router.get('/protocols', (req, res) => {
  try {
    const current = queryAll(
      `SELECT protocol, byte_count, packet_count, timestamp FROM protocol_stats
       WHERE timestamp = (SELECT MAX(timestamp) FROM protocol_stats)
       ORDER BY byte_count DESC`
    );
    const hourly = queryAll(
      `SELECT protocol, COUNT(*) as packet_count, COALESCE(SUM(size), 0) as byte_count
       FROM packets WHERE timestamp > datetime('now', '-1 hour')
       GROUP BY protocol ORDER BY byte_count DESC`
    );
    res.json({ current, hourly });
  } catch (err) {
    console.error('[Stats] GET /protocols error:', err.message);
    res.status(500).json({ error: 'Failed to fetch protocol stats' });
  }
});

// GET /api/stats/ports
router.get('/ports', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const current = queryAll(
      `SELECT port, protocol, byte_count, connection_count, timestamp FROM port_stats
       WHERE timestamp = (SELECT MAX(timestamp) FROM port_stats)
       ORDER BY byte_count DESC LIMIT ?`,
      [parseInt(limit)]
    );
    const hourly = queryAll(
      `SELECT dst_port as port, protocol, COUNT(*) as connection_count, COALESCE(SUM(size), 0) as byte_count
       FROM packets WHERE dst_port IS NOT NULL AND timestamp > datetime('now', '-1 hour')
       GROUP BY dst_port, protocol ORDER BY byte_count DESC LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ current, hourly });
  } catch (err) {
    console.error('[Stats] GET /ports error:', err.message);
    res.status(500).json({ error: 'Failed to fetch port stats' });
  }
});

module.exports = router;
