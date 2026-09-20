-- ============================================================
-- NetPulse — Network Intelligence Platform
-- SQLite Database Schema (Zero Setup)
-- ============================================================

-- Packets — Raw captured packet records
CREATE TABLE IF NOT EXISTS packets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
    src_ip      TEXT NOT NULL,
    dst_ip      TEXT NOT NULL,
    protocol    TEXT NOT NULL,
    src_port    INTEGER,
    dst_port    INTEGER,
    size        INTEGER NOT NULL DEFAULT 0,
    ttl         INTEGER,
    flags       TEXT,
    info        TEXT
);

CREATE INDEX IF NOT EXISTS idx_packets_timestamp ON packets (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_packets_src_ip ON packets (src_ip);
CREATE INDEX IF NOT EXISTS idx_packets_dst_ip ON packets (dst_ip);
CREATE INDEX IF NOT EXISTS idx_packets_protocol ON packets (protocol);

-- Flows — Aggregated traffic flows (src → dst pairs)
CREATE TABLE IF NOT EXISTS flows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    src_ip      TEXT NOT NULL,
    dst_ip      TEXT NOT NULL,
    protocol    TEXT NOT NULL,
    src_port    INTEGER DEFAULT 0,
    dst_port    INTEGER DEFAULT 0,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    packet_count INTEGER NOT NULL DEFAULT 0,
    first_seen  TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(src_ip, dst_ip, protocol, src_port, dst_port)
);

CREATE INDEX IF NOT EXISTS idx_flows_last_seen ON flows (last_seen DESC);

-- Device Stats — Per-device traffic statistics
CREATE TABLE IF NOT EXISTS device_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ip              TEXT NOT NULL UNIQUE,
    hostname        TEXT,
    mac_address     TEXT,
    total_bytes_sent INTEGER NOT NULL DEFAULT 0,
    total_bytes_recv INTEGER NOT NULL DEFAULT 0,
    packet_count    INTEGER NOT NULL DEFAULT 0,
    first_seen      TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
    is_local        INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_device_stats_ip ON device_stats (ip);

-- Protocol Stats — Protocol distribution snapshots
CREATE TABLE IF NOT EXISTS protocol_stats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol    TEXT NOT NULL,
    byte_count  INTEGER NOT NULL DEFAULT 0,
    packet_count INTEGER NOT NULL DEFAULT 0,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_protocol_stats_timestamp ON protocol_stats (timestamp DESC);

-- Port Stats — Port usage snapshots
CREATE TABLE IF NOT EXISTS port_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    port            INTEGER NOT NULL,
    protocol        TEXT NOT NULL DEFAULT 'TCP',
    byte_count      INTEGER NOT NULL DEFAULT 0,
    connection_count INTEGER NOT NULL DEFAULT 0,
    timestamp       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_port_stats_timestamp ON port_stats (timestamp DESC);

-- Bandwidth History — Time-series bandwidth measurements
CREATE TABLE IF NOT EXISTS bandwidth_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT NOT NULL DEFAULT (datetime('now')),
    bytes_per_sec   INTEGER NOT NULL DEFAULT 0,
    packets_per_sec INTEGER NOT NULL DEFAULT 0,
    active_devices  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bandwidth_timestamp ON bandwidth_history (timestamp DESC);

-- Anomalies — Detected traffic anomalies / alerts
CREATE TABLE IF NOT EXISTS anomalies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'warning',
    title       TEXT NOT NULL,
    description TEXT,
    src_ip      TEXT,
    dst_ip      TEXT,
    protocol    TEXT,
    port        INTEGER,
    value       REAL,
    threshold   REAL,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
    resolved    INTEGER NOT NULL DEFAULT 0,
    resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomalies (resolved);
