"""
NetPulse Capture Engine — Packet Sniffer
Core packet capture using Scapy with live and demo modes
"""
import time
import random
import threading
import logging
from datetime import datetime, timezone
from queue import Queue

import config

logger = logging.getLogger('netpulse.sniffer')


class PacketSniffer:
    """
    Captures network packets using Scapy.
    Supports both live capture and demo/simulation mode.
    """

    def __init__(self, packet_queue: Queue):
        self._queue = packet_queue
        self._running = False
        self._thread = None
        self._packet_count = 0

    def start(self):
        """Start the sniffer in a background thread."""
        self._running = True
        if config.DEMO_MODE:
            logger.info('Starting in DEMO MODE — generating simulated traffic')
            self._thread = threading.Thread(target=self._demo_loop, daemon=True)
        else:
            logger.info('Starting LIVE packet capture')
            self._thread = threading.Thread(target=self._live_capture, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the sniffer."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info(f'Sniffer stopped. Total packets captured: {self._packet_count}')

    def _live_capture(self):
        """Live packet capture using Scapy's sniff()."""
        try:
            from scapy.all import sniff
            from parser import parse_packet

            def process_packet(packet):
                if not self._running:
                    return
                parsed = parse_packet(packet)
                if parsed:
                    self._queue.put(parsed)
                    self._packet_count += 1

            logger.info(f'Sniffing on interface: {config.INTERFACE or "auto-detect"}')
            if config.BPF_FILTER:
                logger.info(f'BPF filter: {config.BPF_FILTER}')

            sniff(
                iface=config.INTERFACE,
                filter=config.BPF_FILTER or None,
                prn=process_packet,
                store=False,
                count=config.CAPTURE_COUNT or 0,
                stop_filter=lambda _: not self._running,
            )
        except PermissionError:
            logger.error(
                'Permission denied! Packet capture requires admin/root privileges.\n'
                'Run with: sudo python main.py (Linux/Mac) or as Administrator (Windows).\n'
                'Or use demo mode: python main.py --demo'
            )
        except ImportError:
            logger.error(
                'Scapy not installed. Install with: pip install scapy\n'
                'On Windows, also install Npcap: https://nmap.org/npcap/'
            )
        except Exception as e:
            logger.error(f'Sniffer error: {e}')

    def _demo_loop(self):
        """Generate simulated network traffic for demo purposes."""
        logger.info(f'Demo mode: generating ~{config.DEMO_PACKET_RATE} packets/sec')

        # Simulated network devices
        devices = [
            {'ip': '192.168.1.1', 'mac': 'AA:BB:CC:DD:EE:01', 'role': 'gateway'},
            {'ip': '192.168.1.10', 'mac': 'AA:BB:CC:DD:EE:10', 'role': 'workstation'},
            {'ip': '192.168.1.11', 'mac': 'AA:BB:CC:DD:EE:11', 'role': 'workstation'},
            {'ip': '192.168.1.12', 'mac': 'AA:BB:CC:DD:EE:12', 'role': 'workstation'},
            {'ip': '192.168.1.20', 'mac': 'AA:BB:CC:DD:EE:20', 'role': 'server'},
            {'ip': '192.168.1.21', 'mac': 'AA:BB:CC:DD:EE:21', 'role': 'server'},
            {'ip': '192.168.1.30', 'mac': 'AA:BB:CC:DD:EE:30', 'role': 'iot'},
            {'ip': '192.168.1.31', 'mac': 'AA:BB:CC:DD:EE:31', 'role': 'iot'},
        ]

        external_ips = [
            '8.8.8.8', '1.1.1.1', '142.250.190.78', '151.101.1.140',
            '104.244.42.193', '157.240.1.35', '13.107.42.14',
            '52.96.166.178', '34.107.243.93', '172.217.14.99',
        ]

        protocols = [
            {'name': 'TCP', 'weight': 50, 'ports': [80, 443, 8080, 3000, 5000]},
            {'name': 'UDP', 'weight': 20, 'ports': [53, 67, 68, 123, 5353]},
            {'name': 'DNS', 'weight': 15, 'ports': [53]},
            {'name': 'ICMP', 'weight': 5, 'ports': []},
            {'name': 'ARP', 'weight': 5, 'ports': []},
            {'name': 'HTTPS', 'weight': 3, 'ports': [443, 8443]},
            {'name': 'SSH', 'weight': 2, 'ports': [22]},
        ]

        dns_names = [
            'google.com', 'github.com', 'stackoverflow.com',
            'youtube.com', 'reddit.com', 'twitter.com',
            'amazon.com', 'microsoft.com', 'cloudflare.com',
            'api.openai.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com',
        ]

        protocol_weights = [p['weight'] for p in protocols]
        total_weight = sum(protocol_weights)
        protocol_probs = [w / total_weight for w in protocol_weights]

        interval = 1.0 / config.DEMO_PACKET_RATE
        spike_counter = 0

        while self._running:
            try:
                # Occasionally create traffic spikes
                spike_counter += 1
                burst_multiplier = 1
                if spike_counter % 200 == 0:
                    burst_multiplier = random.randint(3, 8)
                    logger.debug(f'Traffic spike! {burst_multiplier}x burst')

                for _ in range(burst_multiplier):
                    # Select protocol
                    proto = random.choices(protocols, weights=protocol_probs, k=1)[0]

                    # Select source and destination
                    if random.random() < 0.6:
                        # Internal → External
                        src = random.choice([d for d in devices if d['role'] != 'gateway'])
                        dst_ip = random.choice(external_ips)
                        dst_mac = devices[0]['mac']  # gateway MAC
                    elif random.random() < 0.3:
                        # External → Internal
                        src_ip_ext = random.choice(external_ips)
                        dst = random.choice([d for d in devices if d['role'] != 'gateway'])
                        src = {'ip': src_ip_ext, 'mac': 'FF:FF:FF:FF:FF:FF'}
                        dst_ip = dst['ip']
                        dst_mac = dst['mac']
                    else:
                        # Internal → Internal
                        src = random.choice(devices)
                        dst = random.choice([d for d in devices if d['ip'] != src['ip']])
                        dst_ip = dst['ip']
                        dst_mac = dst['mac']

                    src_ip = src['ip']
                    src_mac = src['mac']

                    # Generate packet data
                    src_port = random.randint(1024, 65535) if proto['ports'] else None
                    dst_port = random.choice(proto['ports']) if proto['ports'] else None

                    # Vary packet sizes by protocol
                    if proto['name'] in ('DNS', 'ARP', 'ICMP'):
                        size = random.randint(40, 200)
                    elif proto['name'] in ('HTTPS', 'TCP'):
                        size = random.randint(64, 1500)
                    else:
                        size = random.randint(64, 1024)

                    # Build info string
                    info = ''
                    if proto['name'] == 'DNS':
                        domain = random.choice(dns_names)
                        info = f'DNS Query: {domain}'
                    elif proto['name'] == 'ICMP':
                        info = random.choice(['Echo Request', 'Echo Reply', 'Destination Unreachable'])
                    elif proto['name'] == 'ARP':
                        info = f'ARP Request: Who has {dst_ip}? Tell {src_ip}'
                    elif dst_port == 443:
                        info = 'HTTPS'
                    elif dst_port == 80:
                        info = 'HTTP'
                    elif dst_port == 22:
                        info = 'SSH'

                    flags = None
                    if proto['name'] == 'TCP':
                        flags = random.choice(['S', 'SA', 'A', 'PA', 'FA', 'RA'])

                    parsed = {
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'src_ip': src_ip,
                        'dst_ip': dst_ip,
                        'protocol': proto['name'],
                        'src_port': src_port,
                        'dst_port': dst_port,
                        'size': size,
                        'ttl': random.choice([64, 128, 255]),
                        'flags': flags,
                        'info': info,
                        'src_mac': src_mac,
                        'dst_mac': dst_mac if 'dst_mac' in dir() else None,
                    }

                    self._queue.put(parsed)
                    self._packet_count += 1

                time.sleep(interval * random.uniform(0.5, 1.5))

            except Exception as e:
                logger.error(f'Demo loop error: {e}')
                time.sleep(1)

    @property
    def packet_count(self):
        return self._packet_count
