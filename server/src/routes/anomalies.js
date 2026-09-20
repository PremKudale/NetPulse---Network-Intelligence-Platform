const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db');

// GET /api/anomalies
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, severity, type, resolved } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (severity) { conditions.push('severity = ?'); params.push(severity); }
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (resolved !== undefined) { conditions.push('resolved = ?'); params.push(resolved === 'true' ? 1 : 0); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = queryOne(`SELECT COUNT(*) as total FROM anomalies ${where}`, params);
    const total = countRow?.total || 0;

    const rows = queryAll(
      `SELECT * FROM anomalies ${where}
       ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 ELSE 4 END,
       timestamp DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('[Anomalies] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// GET /api/anomalies/summary
router.get('/summary', (req, res) => {
  try {
    const rows = queryAll(
      `SELECT severity, COUNT(*) as count FROM anomalies WHERE resolved = 0
       GROUP BY severity ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 ELSE 4 END`
    );
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    res.json({ total, by_severity: rows });
  } catch (err) {
    console.error('[Anomalies] GET /summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch anomaly summary' });
  }
});

// PUT /api/anomalies/:id/resolve
router.put('/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    run(`UPDATE anomalies SET resolved = 1, resolved_at = datetime('now') WHERE id = ?`, [parseInt(id)]);
    const updated = queryOne('SELECT * FROM anomalies WHERE id = ?', [parseInt(id)]);
    if (!updated) return res.status(404).json({ error: 'Anomaly not found' });

    const io = req.app.get('io');
    if (io) io.emit('anomaly:resolved', updated);
    res.json({ data: updated });
  } catch (err) {
    console.error('[Anomalies] PUT /:id/resolve error:', err.message);
    res.status(500).json({ error: 'Failed to resolve anomaly' });
  }
});

module.exports = router;
