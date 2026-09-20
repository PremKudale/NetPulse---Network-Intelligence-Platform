"""
NetPulse Capture Engine — Database Operations (SQLite)
Batch inserts aggregated data into the local SQLite database
"""
import sqlite3
import os
import logging
import config

logger = logging.getLogger('netpulse.db')

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'netpulse.db')


class DatabaseManager:
    """Handles all SQLite operations for the capture engine."""

    def __init__(self):
        self._conn = None
        self._connected = False

    def connect(self):
        """Establish database connection."""
        try:
            os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
            self._conn = sqlite3.connect(DB_PATH, timeout=10)
            self._conn.execute('PRAGMA journal_mode=WAL')
            self._conn.execute('PRAGMA busy_timeout=5000')
            self._initialize_schema()
            self._connected = True
            logger.info(f'Connected to SQLite: {DB_PATH}')
            return True
        except Exception as e:
            logger.error(f'Failed to connect to SQLite: {e}')
            self._connected = False
            return False

    def _initialize_schema(self):
        """Initialize database schema."""
        schema_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'schema.sql')
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                self._conn.executescript(f.read())
            logger.info('Schema initialized')

    def is_connected(self):
        if not self._connected or not self._conn:
            return False
        try:
            self._conn.execute('SELECT 1')
            return True
        except Exception:
            self._connected = False
            return False

    def save_aggregated_data(self, data):
        if not self.is_connected():
            if not self.connect():
                return False
        try:
            self._save_packets(data.get('packets', []))
            self._save_bandwidth(data.get('bandwidth', {}))
            self._save_devices(data.get('devices', []))
            self._save_protocol_stats(data.get('protocols', []))
            self._save_port_stats(data.get('ports', []))
            self._conn.commit()
            return True
        except Exception as e:
            logger.error(f'Error saving to database: {e}')
            return False

    def save_anomalies(self, anomalies):
        if not self.is_connected() or not anomalies:
            return
        try:
            for a in anomalies:
                self._conn.execute(
                    '''INSERT INTO anomalies (type, severity, title, description, src_ip, dst_ip, protocol, port, value, threshold)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (a.get('type'), a.get('severity', 'info'), a.get('title'), a.get('description'),
                     a.get('src_ip'), a.get('dst_ip'), a.get('protocol'), a.get('port'),
                     a.get('value'), a.get('threshold'))
                )
            self._conn.commit()
            logger.info(f'Saved {len(anomalies)} anomalies')
        except Exception as e:
            logger.error(f'Error saving anomalies: {e}')

    def _save_packets(self, packets):
        if not packets:
            return
        batch = packets[:500]
        try:
            self._conn.executemany(
                '''INSERT INTO packets (timestamp, src_ip, dst_ip, protocol, src_port, dst_port, size, ttl, flags)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                [(p.get('timestamp'), p.get('src_ip', '0.0.0.0'), p.get('dst_ip', '0.0.0.0'),
                  p.get('protocol', 'UNKNOWN'), p.get('src_port'), p.get('dst_port'),
                  p.get('size', 0), p.get('ttl'), p.get('flags')) for p in batch]
            )
        except Exception as e:
            logger.error(f'Error saving packets: {e}')

    def _save_bandwidth(self, bandwidth):
        if not bandwidth:
            return
        try:
            self._conn.execute(
                'INSERT INTO bandwidth_history (timestamp, bytes_per_sec, packets_per_sec, active_devices) VALUES (?, ?, ?, ?)',
                (bandwidth.get('timestamp'), bandwidth.get('bytes_per_sec', 0),
                 bandwidth.get('packets_per_sec', 0), bandwidth.get('active_devices', 0))
            )
        except Exception as e:
            logger.error(f'Error saving bandwidth: {e}')

    def _save_devices(self, devices):
        if not devices:
            return
        try:
            for d in devices:
                ip = d.get('ip')
                if not ip or ip == '0.0.0.0':
                    continue
                self._conn.execute(
                    '''INSERT INTO device_stats (ip, mac_address, total_bytes_sent, total_bytes_recv, packet_count, last_seen)
                       VALUES (?, ?, ?, ?, ?, ?)
                       ON CONFLICT(ip) DO UPDATE SET
                         mac_address = COALESCE(excluded.mac_address, device_stats.mac_address),
                         total_bytes_sent = excluded.total_bytes_sent,
                         total_bytes_recv = excluded.total_bytes_recv,
                         packet_count = excluded.packet_count,
                         last_seen = excluded.last_seen''',
                    (ip, d.get('mac_address'), d.get('total_bytes_sent', 0),
                     d.get('total_bytes_recv', 0), d.get('packet_count', 0), d.get('last_seen'))
                )
        except Exception as e:
            logger.error(f'Error saving devices: {e}')

    def _save_protocol_stats(self, protocols):
        if not protocols:
            return
        try:
            self._conn.executemany(
                'INSERT INTO protocol_stats (protocol, byte_count, packet_count) VALUES (?, ?, ?)',
                [(p.get('protocol'), p.get('byte_count', 0), p.get('packet_count', 0)) for p in protocols]
            )
        except Exception as e:
            logger.error(f'Error saving protocol stats: {e}')

    def _save_port_stats(self, ports):
        if not ports:
            return
        try:
            self._conn.executemany(
                'INSERT INTO port_stats (port, protocol, byte_count, connection_count) VALUES (?, ?, ?, ?)',
                [(p.get('port'), p.get('protocol', 'TCP'), p.get('byte_count', 0), p.get('connection_count', 0)) for p in ports]
            )
        except Exception as e:
            logger.error(f'Error saving port stats: {e}')

    def close(self):
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._connected = False
