"""
NetPulse Capture Engine — Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────
DB_HOST = os.getenv('PG_HOST', 'localhost')
DB_PORT = int(os.getenv('PG_PORT', '5432'))
DB_NAME = os.getenv('PG_DATABASE', 'netpulse')
DB_USER = os.getenv('PG_USER', 'postgres')
DB_PASSWORD = os.getenv('PG_PASSWORD', 'postgres')

# ── API Server ────────────────────────────────────────────
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3001')
API_INGEST_ENDPOINT = f'{API_BASE_URL}/api/traffic/ingest'

# ── Capture ───────────────────────────────────────────────
INTERFACE = os.getenv('CAPTURE_INTERFACE', None)  # None = auto-detect
BPF_FILTER = os.getenv('BPF_FILTER', '')  # e.g., 'tcp or udp or icmp'
CAPTURE_COUNT = 0  # 0 = unlimited

# ── Aggregation ───────────────────────────────────────────
FLUSH_INTERVAL = int(os.getenv('FLUSH_INTERVAL', '5'))  # seconds
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '100'))  # packets per batch

# ── Anomaly Detection ────────────────────────────────────
BANDWIDTH_SPIKE_FACTOR = float(os.getenv('BANDWIDTH_SPIKE_FACTOR', '2.0'))  # σ multiplier
PORT_SCAN_THRESHOLD = int(os.getenv('PORT_SCAN_THRESHOLD', '20'))  # unique ports in 10s
FLOOD_THRESHOLD = int(os.getenv('FLOOD_THRESHOLD', '500'))  # packets/sec from single IP

# ── Demo Mode ─────────────────────────────────────────────
DEMO_MODE = os.getenv('DEMO_MODE', 'false').lower() == 'true'
DEMO_PACKET_RATE = float(os.getenv('DEMO_PACKET_RATE', '30'))  # packets per second

# ── Logging ───────────────────────────────────────────────
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
