"""
NetPulse Capture Engine — Packet Sniffer
Core packet capture with live, PCAP replay, and realistic simulation modes.

The demo mode replays real packets parsed from PCAP files and augments them
with statistically-accurate enterprise network traffic patterns based on
CAIDA backbone statistics and enterprise network research:
  - TCP:   ~82% of traffic (HTTPS 55%, HTTP 8%, SSH 3%, RDP 2%, SMTP/other 14%)
  - UDP:   ~14% of traffic (DNS 5%, NTP 1%, DHCP <1%, video/QUIC 7%)
  - ICMP:  ~2%
  - ARP:   ~2%

Bandwidth follows a realistic diurnal (time-of-day) curve with micro-bursts,
packet sizes match real-world protocol distributions (avg ~500 bytes), and
devices model a typical small-office/home-office with gateway, workstations,
servers, mobile, and IoT endpoints.
"""
import os
import json
import time
import math
import random
import hashlib
import threading
import logging
from datetime import datetime, timezone
from queue import Queue

import config

logger = logging.getLogger('netpulse.sniffer')

# ── Paths ────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
REAL_PACKETS_FILE = os.path.join(DATA_DIR, 'real_packets.json')


# ═════════════════════════════════════════════════════════════
# Real-world network profiles
# ═════════════════════════════════════════════════════════════

# Realistic office-network device inventory (modeled on a 25-person office)
ENTERPRISE_DEVICES = [
    # ── Gateway / Router ──
    {'ip': '192.168.1.1',   'mac': '3C:37:86:5D:E4:01', 'hostname': 'gw-core-01',         'role': 'gateway',     'vendor': 'Cisco'},
    # ── Workstations ──
    {'ip': '192.168.1.101', 'mac': 'F0:18:98:3A:B2:10', 'hostname': 'ws-dev-anand',       'role': 'workstation', 'vendor': 'Dell'},
    {'ip': '192.168.1.102', 'mac': 'A4:83:E7:22:CD:11', 'hostname': 'ws-dev-priya',       'role': 'workstation', 'vendor': 'Lenovo'},
    {'ip': '192.168.1.103', 'mac': '98:FA:9B:45:1E:12', 'hostname': 'ws-design-rahul',    'role': 'workstation', 'vendor': 'Apple'},
    {'ip': '192.168.1.104', 'mac': 'BC:D0:74:58:9F:13', 'hostname': 'ws-mgmt-sneha',      'role': 'workstation', 'vendor': 'HP'},
    {'ip': '192.168.1.105', 'mac': '48:2C:A0:6B:D3:14', 'hostname': 'ws-sales-vikram',    'role': 'workstation', 'vendor': 'Dell'},
    {'ip': '192.168.1.106', 'mac': '70:5A:0F:7C:E8:15', 'hostname': 'ws-hr-meera',        'role': 'workstation', 'vendor': 'Lenovo'},
    {'ip': '192.168.1.107', 'mac': 'DC:A6:32:8D:F1:16', 'hostname': 'ws-finance-arjun',   'role': 'workstation', 'vendor': 'Dell'},
    # ── Servers ──
    {'ip': '192.168.1.10',  'mac': '00:50:56:A1:23:20', 'hostname': 'srv-app-01',         'role': 'server',      'vendor': 'VMware'},
    {'ip': '192.168.1.11',  'mac': '00:50:56:A1:23:21', 'hostname': 'srv-db-01',          'role': 'server',      'vendor': 'VMware'},
    {'ip': '192.168.1.12',  'mac': '00:50:56:A1:23:22', 'hostname': 'srv-file-01',        'role': 'server',      'vendor': 'VMware'},
    {'ip': '192.168.1.13',  'mac': '00:50:56:A1:23:23', 'hostname': 'srv-mail-01',        'role': 'server',      'vendor': 'VMware'},
    # ── Mobile / Laptops (Wi-Fi) ──
    {'ip': '192.168.1.150', 'mac': '8C:85:90:AB:12:30', 'hostname': 'mob-iphone-priya',   'role': 'mobile',      'vendor': 'Apple'},
    {'ip': '192.168.1.151', 'mac': '34:14:B5:CD:34:31', 'hostname': 'mob-pixel-anand',    'role': 'mobile',      'vendor': 'Google'},
    {'ip': '192.168.1.152', 'mac': 'E8:6F:38:EF:56:32', 'hostname': 'laptop-vikram-wifi', 'role': 'mobile',      'vendor': 'Dell'},
    # ── IoT / Infrastructure ──
    {'ip': '192.168.1.200', 'mac': '00:17:C5:12:78:40', 'hostname': 'printer-hp-3f',      'role': 'iot',         'vendor': 'HP'},
    {'ip': '192.168.1.201', 'mac': '7C:2F:80:23:89:41', 'hostname': 'cam-lobby-01',       'role': 'iot',         'vendor': 'Hikvision'},
    {'ip': '192.168.1.202', 'mac': '7C:2F:80:34:9A:42', 'hostname': 'cam-server-room',    'role': 'iot',         'vendor': 'Hikvision'},
    {'ip': '192.168.1.203', 'mac': 'B0:CE:18:45:AB:43', 'hostname': 'voip-lobby',         'role': 'iot',         'vendor': 'Polycom'},
    {'ip': '192.168.1.204', 'mac': '44:07:0B:56:BC:44', 'hostname': 'ap-wifi-3f',         'role': 'iot',         'vendor': 'Ubiquiti'},
]

# Real external endpoints (actual service IPs from public DNS records)
EXTERNAL_ENDPOINTS = [
    {'ip': '142.250.192.46',  'name': 'google.com',            'service': 'Google Search'},
    {'ip': '142.250.193.78',  'name': 'www.google.com',        'service': 'Google Web'},
    {'ip': '142.250.80.46',   'name': 'mail.google.com',       'service': 'Gmail'},
    {'ip': '142.251.33.174',  'name': 'drive.google.com',      'service': 'Google Drive'},
    {'ip': '172.217.14.99',   'name': 'fonts.googleapis.com',  'service': 'Google Fonts CDN'},
    {'ip': '20.190.159.0',    'name': 'login.microsoftonline.com', 'service': 'Microsoft 365'},
    {'ip': '52.96.166.178',   'name': 'outlook.office365.com', 'service': 'Office 365 Mail'},
    {'ip': '13.107.42.14',    'name': 'teams.microsoft.com',   'service': 'MS Teams'},
    {'ip': '20.198.162.76',   'name': 'onedrive.live.com',     'service': 'OneDrive'},
    {'ip': '151.101.1.140',   'name': 'github.com',            'service': 'GitHub'},
    {'ip': '185.199.108.133', 'name': 'raw.githubusercontent.com', 'service': 'GitHub CDN'},
    {'ip': '104.244.42.193',  'name': 'twitter.com',           'service': 'Twitter/X'},
    {'ip': '157.240.1.35',    'name': 'facebook.com',          'service': 'Facebook'},
    {'ip': '31.13.71.36',     'name': 'instagram.com',         'service': 'Instagram'},
    {'ip': '151.101.65.69',   'name': 'reddit.com',            'service': 'Reddit'},
    {'ip': '99.84.191.48',    'name': 'slack.com',             'service': 'Slack'},
    {'ip': '34.107.243.93',   'name': 'cloud.google.com',      'service': 'Google Cloud'},
    {'ip': '44.238.134.70',   'name': 'zoom.us',               'service': 'Zoom Video'},
    {'ip': '23.32.238.122',   'name': 'aws.amazon.com',        'service': 'AWS'},
    {'ip': '104.18.32.7',     'name': 'cloudflare.com',        'service': 'Cloudflare'},
    {'ip': '1.1.1.1',         'name': 'one.one.one.one',       'service': 'Cloudflare DNS'},
    {'ip': '8.8.8.8',         'name': 'dns.google',            'service': 'Google DNS'},
    {'ip': '8.8.4.4',         'name': 'dns.google (secondary)', 'service': 'Google DNS 2'},
    {'ip': '208.67.222.222',  'name': 'resolver1.opendns.com', 'service': 'OpenDNS'},
    {'ip': '162.159.200.1',   'name': 'ntp.cloudflare.com',    'service': 'Cloudflare NTP'},
    {'ip': '129.6.15.28',     'name': 'time.nist.gov',         'service': 'NIST NTP'},
    {'ip': '91.189.89.198',   'name': 'ntp.ubuntu.com',        'service': 'Ubuntu NTP'},
]

# DNS domains seen in enterprise traffic
DNS_DOMAINS = [
    'google.com', 'www.google.com', 'mail.google.com', 'drive.google.com',
    'accounts.google.com', 'fonts.googleapis.com', 'ajax.googleapis.com',
    'login.microsoftonline.com', 'outlook.office365.com', 'teams.microsoft.com',
    'graph.microsoft.com', 'onedrive.live.com', 'office.com',
    'github.com', 'api.github.com', 'raw.githubusercontent.com',
    'stackoverflow.com', 'cdn.sstatic.net',
    'slack-edge.com', 'slack.com', 'app.slack.com',
    'zoom.us', 'zoomcdn.com',
    'cloudflare.com', 'cdnjs.cloudflare.com', '1.1.1.1',
    'amazon.com', 'aws.amazon.com', 's3.amazonaws.com',
    'facebook.com', 'twitter.com', 'reddit.com', 'instagram.com',
    'youtube.com', 'i.ytimg.com', 'yt3.ggpht.com',
    'linkedin.com', 'medium.com', 'notion.so',
    'npmjs.org', 'registry.npmjs.org', 'pypi.org',
    'update.microsoft.com', 'ctldl.windowsupdate.com',
    'ocsp.digicert.com', 'crl.globalsign.com',
]

# ── Enterprise protocol distribution (by packet count) ─────
# Based on CAIDA backbone + enterprise campus studies
PROTOCOL_PROFILES = [
    # protocol, weight, dst_ports, size_range, info_templates
    ('HTTPS',  55, [443, 8443],        (64, 1460),  ['TLS/SSL', 'TLS 1.3 Application Data', 'TLS ClientHello', 'TLS ServerHello', 'TLS ChangeCipherSpec']),
    ('HTTP',    8, [80, 8080, 3000],   (64, 1460),  ['GET / HTTP/1.1', 'HTTP/1.1 200 OK', 'POST /api/data', 'GET /static/bundle.js', 'HTTP/1.1 304 Not Modified']),
    ('TCP',    14, [3306, 5432, 6379, 27017, 445, 139, 389, 636, 1433, 3389, 5985], (64, 1460),
                   ['TCP handshake', 'SMB2 Session Setup', 'LDAP bindRequest', 'SQL query', 'TCP keepalive', 'RDP session data']),
    ('DNS',     5, [53],               (60, 512),   None),  # DNS gets special handling
    ('SSH',     3, [22],               (64, 1200),  ['SSH-2.0 session', 'SSH encrypted packet', 'SSH key exchange', 'SSH channel data']),
    ('UDP',     4, [5060, 5004, 5005, 1900, 3478, 3479, 443], (64, 1400),
                   ['QUIC Initial', 'QUIC Protected', 'STUN Binding Request', 'SIP INVITE', 'SSDP M-SEARCH', 'RTP audio stream']),
    ('NTP',     1, [123],              (76, 76),    ['NTP v4 client request', 'NTP v4 server response']),
    ('DHCP',    0.5, [67, 68],         (300, 576),  ['DHCP Discover', 'DHCP Offer', 'DHCP Request', 'DHCP ACK']),
    ('ICMP',    2, [],                 (64, 1500),  ['Echo Request (ping)', 'Echo Reply', 'Destination Unreachable', 'Time Exceeded (traceroute)', 'Redirect']),
    ('ARP',     2, [],                 (42, 60),    None),  # ARP gets special handling
    ('SMTP',    1, [25, 587],          (64, 1400),  ['SMTP EHLO', 'SMTP MAIL FROM', 'SMTP DATA', 'SMTP 250 OK']),
    ('RDP',     2, [3389],             (64, 1460),  ['RDP session data', 'RDP graphics update', 'RDP input event']),
    ('IGMP',    0.5, [],               (32, 60),    ['IGMP Membership Report', 'IGMP Leave Group']),
    ('Syslog',  1, [514],              (100, 1024), ['Syslog: auth.info', 'Syslog: kern.warning', 'Syslog: daemon.notice']),
    ('SNMP',    1, [161, 162],         (64, 484),   ['SNMP GetRequest', 'SNMP GetResponse', 'SNMP Trap']),
]


class PacketSniffer:
    """
    Captures network packets using Scapy (live mode) or replays
    real PCAP data augmented with realistic enterprise traffic patterns.
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
            logger.info('Starting in REALISTIC REPLAY MODE — real PCAP data + enterprise simulation')
            self._thread = threading.Thread(target=self._realistic_replay_loop, daemon=True)
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

    # ═════════════════════════════════════════════════════════
    #  Realistic Replay Engine
    # ═════════════════════════════════════════════════════════

    def _load_real_packets(self):
        """Load pre-processed real PCAP packets from JSON."""
        if os.path.exists(REAL_PACKETS_FILE):
            try:
                with open(REAL_PACKETS_FILE, 'r') as f:
                    packets = json.load(f)
                logger.info(f'Loaded {len(packets)} real packets from PCAP dataset')
                return packets
            except Exception as e:
                logger.warning(f'Failed to load real packets: {e}')
        else:
            logger.warning(f'Real packet dataset not found at {REAL_PACKETS_FILE}')
            logger.info('Run: python pcap_preprocess.py to generate it from PCAP files')
        return []

    def _diurnal_multiplier(self):
        """
        Returns a bandwidth multiplier (0.1–1.0) based on current time-of-day,
        modeling real enterprise traffic patterns:
          - Peak: 09:00–12:00 and 14:00–17:00 (multiplier ~0.8–1.0)
          - Lunch: 12:00–14:00 (dip to ~0.5–0.6)
          - Evening: 17:00–22:00 (gradual decline 0.4–0.6)
          - Night:  22:00–07:00 (low baseline 0.1–0.2)
          - Ramp:   07:00–09:00 (ramp up 0.3–0.7)
        """
        hour = datetime.now().hour + datetime.now().minute / 60.0

        if 9 <= hour < 12:
            base = 0.8 + 0.2 * math.sin((hour - 9) / 3 * math.pi)
        elif 12 <= hour < 14:
            base = 0.5 + 0.1 * math.sin((hour - 12) / 2 * math.pi)
        elif 14 <= hour < 17:
            base = 0.7 + 0.3 * math.sin((hour - 14) / 3 * math.pi)
        elif 17 <= hour < 22:
            base = 0.6 - 0.4 * ((hour - 17) / 5)
        elif 22 <= hour or hour < 7:
            base = 0.15
        else:  # 7–9 ramp
            base = 0.3 + 0.5 * ((hour - 7) / 2)

        # Add small random jitter ±10%
        jitter = random.uniform(-0.1, 0.1)
        return max(0.1, min(1.0, base + jitter))

    def _generate_enterprise_packet(self, real_packets, real_pkt_idx):
        """
        Generate a single realistic packet. 70% of the time uses data
        from a real PCAP packet (with IP remapping to our enterprise subnet),
        30% generates synthetic traffic matching enterprise protocol distributions.
        """
        use_real = random.random() < 0.70 and real_packets
        now_iso = datetime.now(timezone.utc).isoformat()

        if use_real:
            # ── Replay real PCAP packet with enterprise IP remapping ──
            real_pkt = real_packets[real_pkt_idx % len(real_packets)]
            protocol = real_pkt.get('protocol', 'TCP')

            # Normalize protocol — replace obscure ones with common equivalents
            INTERNAL_ONLY_PROTOS = {'ARP', 'DHCP', 'IGMP', 'mDNS', 'Syslog', 'SNMP', 'NTP'}
            if protocol in ('IPv6', 'UNKNOWN', 'IP-2'):
                protocol = 'TCP'

            # Remap source/destination to our enterprise subnet
            src_device = random.choice(ENTERPRISE_DEVICES)

            if protocol in INTERNAL_ONLY_PROTOS:
                # Internal-only protocols stay within the subnet
                dst_dev = random.choice([d for d in ENTERPRISE_DEVICES if d['ip'] != src_device['ip']])
                dst_ip = dst_dev['ip']
                dst_mac = dst_dev['mac']
                info_suffix = ''
            elif random.random() < 0.60:
                # Internal → External (most common in enterprise)
                dst_endpoint = random.choice(EXTERNAL_ENDPOINTS)
                dst_ip = dst_endpoint['ip']
                dst_mac = ENTERPRISE_DEVICES[0]['mac']  # Gateway MAC
                info_suffix = f" → {dst_endpoint['name']}"
            elif random.random() < 0.55:
                # External → Internal (responses)
                ext = random.choice(EXTERNAL_ENDPOINTS)
                src_device = {'ip': ext['ip'], 'mac': 'FF:FF:FF:FF:FF:FF',
                              'hostname': ext['name'], 'role': 'external'}
                dst_dev = random.choice([d for d in ENTERPRISE_DEVICES if d['role'] != 'gateway'])
                dst_ip = dst_dev['ip']
                dst_mac = dst_dev['mac']
                info_suffix = f" ← {ext['name']}"
            else:
                # Internal → Internal
                dst_dev = random.choice([d for d in ENTERPRISE_DEVICES if d['ip'] != src_device['ip']])
                dst_ip = dst_dev['ip']
                dst_mac = dst_dev['mac']
                info_suffix = ''

            info_text = real_pkt.get('info', '')
            if info_suffix and info_text:
                info_text += info_suffix
            elif info_suffix:
                info_text = info_suffix.strip(' →← ')

            return {
                'timestamp': now_iso,
                'src_ip': src_device['ip'] if isinstance(src_device, dict) else src_device,
                'dst_ip': dst_ip,
                'protocol': protocol,
                'src_port': real_pkt.get('src_port') or (random.randint(49152, 65535) if protocol in ('TCP', 'HTTPS', 'HTTP', 'SSH') else None),
                'dst_port': real_pkt.get('dst_port'),
                'size': real_pkt.get('size', random.randint(64, 1460)),
                'ttl': real_pkt.get('ttl', random.choice([64, 128])),
                'flags': real_pkt.get('flags'),
                'info': info_text,
                'src_mac': src_device.get('mac', 'FF:FF:FF:FF:FF:FF'),
                'dst_mac': dst_mac,
            }

        else:
            # ── Synthetic packet from enterprise protocol distribution ──
            return self._generate_synthetic_packet(now_iso)

    def _generate_synthetic_packet(self, now_iso):
        """Generate a fully synthetic packet matching enterprise protocol distributions."""
        # Weighted protocol selection
        weights = [p[1] for p in PROTOCOL_PROFILES]
        profile = random.choices(PROTOCOL_PROFILES, weights=weights, k=1)[0]
        protocol, _, dst_ports, size_range, info_templates = profile

        # Select devices
        src_device = random.choice(ENTERPRISE_DEVICES)

        if protocol in ('ARP', 'DHCP', 'IGMP', 'Syslog', 'SNMP'):
            # Internal-only protocols
            dst_dev = random.choice([d for d in ENTERPRISE_DEVICES if d['ip'] != src_device['ip']])
            dst_ip = dst_dev['ip']
            dst_mac = dst_dev['mac']
        elif random.random() < 0.65:
            # Internal → External
            ext = random.choice(EXTERNAL_ENDPOINTS)
            dst_ip = ext['ip']
            dst_mac = ENTERPRISE_DEVICES[0]['mac']
        elif random.random() < 0.4:
            # External → Internal
            ext = random.choice(EXTERNAL_ENDPOINTS)
            src_device = {'ip': ext['ip'], 'mac': 'FF:FF:FF:FF:FF:FF',
                          'hostname': ext['name'], 'role': 'external'}
            dst_dev = random.choice([d for d in ENTERPRISE_DEVICES if d['role'] != 'gateway'])
            dst_ip = dst_dev['ip']
            dst_mac = dst_dev['mac']
        else:
            # Internal → Internal
            dst_dev = random.choice([d for d in ENTERPRISE_DEVICES if d['ip'] != src_device['ip']])
            dst_ip = dst_dev['ip']
            dst_mac = dst_dev['mac']

        # Port selection
        src_port = random.randint(49152, 65535) if dst_ports else None
        dst_port = random.choice(dst_ports) if dst_ports else None

        # Size — realistic distribution per protocol
        if protocol in ('DNS', 'NTP', 'DHCP', 'ARP', 'IGMP', 'SNMP'):
            size = random.randint(size_range[0], size_range[1])
        elif protocol in ('HTTPS', 'HTTP', 'TCP', 'SSH', 'SMTP', 'RDP'):
            # Bimodal: many small ACKs/headers + some large data segments
            if random.random() < 0.4:
                size = random.randint(54, 128)   # ACK / small header
            else:
                size = random.randint(256, size_range[1])
        elif protocol == 'ICMP':
            size = random.choice([64, 84, 98, 128, 1500])
        else:
            size = random.randint(size_range[0], size_range[1])

        # TCP flags
        flags = None
        if protocol in ('TCP', 'HTTPS', 'HTTP', 'SSH', 'SMTP', 'RDP'):
            flags = random.choices(
                ['S', 'SA', 'A', 'PA', 'FA', 'RA', 'A', 'PA', 'A'],
                weights=[5, 5, 30, 35, 3, 2, 10, 8, 2],
                k=1
            )[0]

        # TTL — realistic values
        if src_device.get('role') == 'external' or not src_device.get('role'):
            ttl = random.choice([46, 47, 48, 52, 55, 57, 58, 112, 113, 116, 117, 118, 119, 120, 128, 240, 244, 248, 252])
        else:
            ttl = random.choice([64, 128])

        # Info text
        if protocol == 'DNS':
            domain = random.choice(DNS_DOMAINS)
            if random.random() < 0.5:
                info = f'Standard query A {domain}'
            else:
                info = f'Standard query response A {domain}'
        elif protocol == 'ARP':
            info = f'Who has {dst_ip}? Tell {src_device["ip"]}'
        elif info_templates:
            info = random.choice(info_templates)
            # Add contextual detail for some
            if protocol == 'HTTPS' and random.random() < 0.3:
                ext = random.choice(EXTERNAL_ENDPOINTS)
                info += f' ({ext["name"]})'
        else:
            info = ''

        return {
            'timestamp': now_iso,
            'src_ip': src_device['ip'] if isinstance(src_device, dict) else src_device,
            'dst_ip': dst_ip,
            'protocol': protocol,
            'src_port': src_port,
            'dst_port': dst_port,
            'size': size,
            'ttl': ttl,
            'flags': flags,
            'info': info,
            'src_mac': src_device.get('mac', 'FF:FF:FF:FF:FF:FF'),
            'dst_mac': dst_mac,
        }

    def _realistic_replay_loop(self):
        """
        Main replay loop — generates enterprise-realistic traffic by combining
        real PCAP packet data with synthetic traffic at realistic rates.

        Target rates (modulated by diurnal curve):
        - Small office: ~30–80 packets/sec, ~50–400 Kbps
        - Medium office: ~100–300 pps, ~0.5–3 Mbps
        We target the configured DEMO_PACKET_RATE as the peak-hour baseline.
        """
        real_packets = self._load_real_packets()
        real_pkt_idx = 0

        base_rate = config.DEMO_PACKET_RATE  # packets/sec at peak
        logger.info(f'Replay engine: base rate = {base_rate} pps (peak)')
        logger.info(f'Replay engine: {len(real_packets)} real PCAP packets loaded for replay')
        logger.info(f'Replay engine: {len(ENTERPRISE_DEVICES)} enterprise devices modeled')
        logger.info(f'Replay engine: {len(EXTERNAL_ENDPOINTS)} external endpoints mapped')

        # ── Micro-burst state ──
        burst_cooldown = 0
        burst_active = False
        burst_multiplier = 1
        burst_remaining = 0

        # ── Connection tracking for realism ──
        active_connections = []  # List of (src, dst, proto, start_time)

        # ── Stats tracking ──
        second_start = time.time()
        pkts_this_second = 0
        bytes_this_second = 0

        while self._running:
            try:
                now = time.time()

                # ── Diurnal rate adjustment ──
                diurnal = self._diurnal_multiplier()
                effective_rate = base_rate * diurnal

                # ── Micro-burst logic (every ~15–45 seconds, burst of 3–12x for 0.5–2s) ──
                burst_cooldown -= 1
                if burst_cooldown <= 0 and not burst_active:
                    if random.random() < 0.08:  # ~8% chance per tick
                        burst_active = True
                        burst_multiplier = random.uniform(3, 12)
                        burst_remaining = random.uniform(0.5, 2.0)
                        burst_type = random.choice([
                            'file download burst',
                            'video call initiation',
                            'cloud sync batch',
                            'OS update check',
                            'database query storm',
                            'CDN asset loading',
                        ])
                        logger.debug(f'Micro-burst: {burst_multiplier:.1f}x for {burst_remaining:.1f}s ({burst_type})')
                        burst_cooldown = random.randint(300, 900)  # 15–45s between bursts

                if burst_active:
                    effective_rate *= burst_multiplier
                    burst_remaining -= 0.05
                    if burst_remaining <= 0:
                        burst_active = False
                        burst_multiplier = 1

                # ── Generate packets for this tick ──
                interval = 0.05  # 50ms tick
                pkts_to_generate = max(1, int(effective_rate * interval * random.uniform(0.7, 1.3)))

                for _ in range(pkts_to_generate):
                    parsed = self._generate_enterprise_packet(real_packets, real_pkt_idx)
                    real_pkt_idx += 1

                    self._queue.put(parsed)
                    self._packet_count += 1
                    pkts_this_second += 1
                    bytes_this_second += parsed.get('size', 0)

                # ── Per-second stats logging ──
                if now - second_start >= 5.0:
                    avg_pps = pkts_this_second / 5.0
                    avg_bps = bytes_this_second * 8 / 5.0
                    if avg_bps >= 1_000_000:
                        bw_str = f'{avg_bps / 1_000_000:.2f} Mbps'
                    elif avg_bps >= 1_000:
                        bw_str = f'{avg_bps / 1_000:.1f} Kbps'
                    else:
                        bw_str = f'{avg_bps:.0f} bps'
                    logger.debug(
                        f'Rate: {avg_pps:.0f} pps | {bw_str} | '
                        f'diurnal={diurnal:.2f} | burst={"ON" if burst_active else "off"}'
                    )
                    pkts_this_second = 0
                    bytes_this_second = 0
                    second_start = now

                # ── Sleep until next tick ──
                time.sleep(interval)

            except Exception as e:
                logger.error(f'Replay loop error: {e}')
                time.sleep(1)

    @property
    def packet_count(self):
        return self._packet_count
