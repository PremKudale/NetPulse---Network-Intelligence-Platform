"""
NetPulse Capture Engine — Main Entry Point
Orchestrates packet capture, aggregation, anomaly detection, DB storage, and API push.

Usage:
    python main.py              # Live capture (requires admin)
    python main.py --demo       # Demo mode with simulated traffic
"""
import sys
import time
import signal
import logging
import argparse
from queue import Queue, Empty

import config
from sniffer import PacketSniffer
from aggregator import FlowAggregator
from anomaly import AnomalyDetector
from db import DatabaseManager
from api_client import APIClient


# ── Logging Setup ─────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger('netpulse')


def print_banner():
    print("""
╔══════════════════════════════════════════════════╗
║                                                  ║
║     ███╗   ██╗███████╗████████╗                  ║
║     ████╗  ██║██╔════╝╚══██╔══╝                  ║
║     ██╔██╗ ██║█████╗     ██║                     ║
║     ██║╚██╗██║██╔══╝     ██║                     ║
║     ██║ ╚████║███████╗   ██║                     ║
║     ╚═╝  ╚═══╝╚══════╝   ╚═╝                     ║
║                                                  ║
║     ██████╗ ██╗   ██╗██╗     ███████╗███████╗    ║
║     ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝    ║
║     ██████╔╝██║   ██║██║     ███████╗█████╗      ║
║     ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝      ║
║     ██║     ╚██████╔╝███████╗███████║███████╗    ║
║     ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝    ║
║                                                  ║
║     Network Intelligence Platform v1.0.0         ║
║     Capture Engine                               ║
║                                                  ║
╚══════════════════════════════════════════════════╝
    """)


def main():
    # ── Parse arguments ───────────────────────────────────
    parser = argparse.ArgumentParser(description='NetPulse Capture Engine')
    parser.add_argument('--demo', action='store_true', help='Run in demo mode with simulated traffic')
    parser.add_argument('--interface', '-i', type=str, help='Network interface to capture on')
    parser.add_argument('--filter', '-f', type=str, help='BPF filter expression')
    parser.add_argument('--no-db', action='store_true', help='Skip database connection')
    parser.add_argument('--no-api', action='store_true', help='Skip API server connection')
    args = parser.parse_args()

    # Override config with CLI args
    if args.demo:
        config.DEMO_MODE = True
    if args.interface:
        config.INTERFACE = args.interface
    if args.filter:
        config.BPF_FILTER = args.filter

    print_banner()

    mode = 'DEMO' if config.DEMO_MODE else 'LIVE'
    logger.info(f'Mode: {mode}')
    logger.info(f'Flush interval: {config.FLUSH_INTERVAL}s')

    # ── Initialize components ─────────────────────────────
    packet_queue = Queue(maxsize=10000)
    sniffer = PacketSniffer(packet_queue)
    aggregator = FlowAggregator()
    detector = AnomalyDetector()
    db = DatabaseManager()
    api = APIClient()

    # Connect to database
    if not args.no_db:
        if db.connect():
            logger.info('Database connected')
        else:
            logger.warning('Database not available — data will not be persisted')

    # Check API server
    if not args.no_api:
        if api.health_check():
            logger.info('API server is reachable')
        else:
            logger.warning('API server not available — live dashboard will not update')

    # ── Graceful shutdown ─────────────────────────────────
    running = True

    def shutdown(signum=None, frame=None):
        nonlocal running
        running = False
        logger.info('Shutting down...')
        sniffer.stop()
        db.close()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ── Start sniffer ─────────────────────────────────────
    sniffer.start()
    logger.info('Capture engine running. Press Ctrl+C to stop.')
    print('')

    # ── Main loop ─────────────────────────────────────────
    last_flush = time.time()
    packets_since_flush = 0

    try:
        while running:
            # Drain packet queue into aggregator
            try:
                while True:
                    parsed = packet_queue.get_nowait()
                    aggregator.add_packet(parsed)
                    packets_since_flush += 1
            except Empty:
                pass

            # Flush at interval
            now = time.time()
            if now - last_flush >= config.FLUSH_INTERVAL:
                if packets_since_flush > 0:
                    # Flush aggregated data
                    data = aggregator.flush()

                    # Run anomaly detection
                    anomalies = detector.analyze(data)
                    if anomalies:
                        logger.warning(f'Detected {len(anomalies)} anomalies')

                    # Save to database
                    if not args.no_db:
                        db.save_aggregated_data(data)
                        if anomalies:
                            db.save_anomalies(anomalies)

                    # Push to API
                    if not args.no_api:
                        api.push_data(data, anomalies)

                    # Log stats
                    bw = data.get('bandwidth', {})
                    summary = data.get('summary', {})
                    logger.info(
                        f'Flush: {packets_since_flush} pkts | '
                        f'{_format_bytes(bw.get("bytes_per_sec", 0))}/s | '
                        f'{bw.get("packets_per_sec", 0)} pps | '
                        f'{summary.get("total_devices", 0)} devices'
                    )

                    packets_since_flush = 0

                last_flush = now

            # Don't spin CPU
            time.sleep(0.05)

    except KeyboardInterrupt:
        pass
    finally:
        shutdown()
        logger.info(f'Total packets captured: {sniffer.packet_count}')
        logger.info('NetPulse Capture Engine stopped.')


def _format_bytes(num_bytes):
    """Format bytes into human-readable string."""
    if num_bytes < 1024:
        return f'{num_bytes} B'
    elif num_bytes < 1024 ** 2:
        return f'{num_bytes / 1024:.1f} KB'
    elif num_bytes < 1024 ** 3:
        return f'{num_bytes / 1024 ** 2:.1f} MB'
    else:
        return f'{num_bytes / 1024 ** 3:.1f} GB'


if __name__ == '__main__':
    main()
