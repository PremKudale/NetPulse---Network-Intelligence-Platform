"""
NetPulse Capture Engine — Anomaly Detector
Detects traffic anomalies: bandwidth spikes, port scans, floods, unusual protocols
"""
import time
import threading
from collections import defaultdict
from datetime import datetime, timezone
import config


class AnomalyDetector:
    """
    Analyzes traffic patterns and detects anomalies.
    """

    def __init__(self):
        self._lock = threading.Lock()

        # Bandwidth history for spike detection
        self._bw_history = []  # list of bytes_per_sec values
        self._bw_mean = 0
        self._bw_std = 0

        # Port scan tracking: {ip: {timestamp: set(ports)}}
        self._port_access = defaultdict(lambda: defaultdict(set))

        # Flood tracking: {ip: [timestamps]}
        self._packet_timestamps = defaultdict(list)

        # Known "normal" protocols
        self._common_protocols = {'TCP', 'UDP', 'ICMP', 'DNS', 'ARP', 'HTTP', 'HTTPS'}

        # Detected anomalies buffer
        self._anomalies = []

    def analyze(self, aggregated_data):
        """
        Analyze the latest aggregated data for anomalies.
        Returns list of detected anomalies.
        """
        with self._lock:
            self._anomalies = []
            now = time.time()

            # ── 1. Bandwidth Spike Detection ──
            bandwidth = aggregated_data.get('bandwidth', {})
            bps = bandwidth.get('bytes_per_sec', 0)
            self._bw_history.append(bps)
            if len(self._bw_history) > 60:
                self._bw_history = self._bw_history[-60:]

            if len(self._bw_history) >= 5:
                self._bw_mean = sum(self._bw_history) / len(self._bw_history)
                variance = sum((x - self._bw_mean) ** 2 for x in self._bw_history) / len(self._bw_history)
                self._bw_std = variance ** 0.5

                if self._bw_std > 0 and bps > self._bw_mean + (config.BANDWIDTH_SPIKE_FACTOR * self._bw_std):
                    self._anomalies.append({
                        'type': 'bandwidth_spike',
                        'severity': 'warning',
                        'title': 'Bandwidth Spike Detected',
                        'description': (
                            f'Current bandwidth ({_format_bytes(bps)}/s) is '
                            f'{((bps - self._bw_mean) / self._bw_std):.1f}σ above the rolling average '
                            f'({_format_bytes(int(self._bw_mean))}/s).'
                        ),
                        'value': bps,
                        'threshold': self._bw_mean + (config.BANDWIDTH_SPIKE_FACTOR * self._bw_std),
                    })

            # ── 2. Port Scan Detection ──
            devices = aggregated_data.get('devices', [])
            flows = aggregated_data.get('flows', [])

            # Track which ports each device is accessing
            device_ports = defaultdict(set)
            for flow in flows:
                dst_port = flow.get('dst_port', 0)
                if dst_port and dst_port != 0:
                    device_ports[flow['src_ip']].add(dst_port)

            for ip, ports in device_ports.items():
                if ip == '0.0.0.0':
                    continue
                if len(ports) > config.PORT_SCAN_THRESHOLD:
                    self._anomalies.append({
                        'type': 'port_scan',
                        'severity': 'critical',
                        'title': f'Possible Port Scan from {ip}',
                        'description': (
                            f'Device {ip} has accessed {len(ports)} unique destination ports, '
                            f'exceeding threshold of {config.PORT_SCAN_THRESHOLD}. '
                            f'Ports include: {", ".join(str(p) for p in sorted(list(ports))[:10])}...'
                        ),
                        'src_ip': ip,
                        'value': len(ports),
                        'threshold': config.PORT_SCAN_THRESHOLD,
                    })

            # ── 3. Flood Detection ──
            for device in devices:
                ip = device.get('ip')
                pkt_count = device.get('packet_count', 0)
                if ip and ip != '0.0.0.0' and pkt_count > config.FLOOD_THRESHOLD:
                    self._anomalies.append({
                        'type': 'traffic_flood',
                        'severity': 'warning',
                        'title': f'High Traffic Volume from {ip}',
                        'description': (
                            f'Device {ip} has generated {pkt_count} packets, '
                            f'exceeding threshold of {config.FLOOD_THRESHOLD}.'
                        ),
                        'src_ip': ip,
                        'value': pkt_count,
                        'threshold': config.FLOOD_THRESHOLD,
                    })

            # ── 4. Unusual Protocol Detection ──
            protocols = aggregated_data.get('protocols', [])
            for proto_stat in protocols:
                proto = proto_stat.get('protocol', '')
                if proto and proto not in self._common_protocols:
                    pkt_count = proto_stat.get('packet_count', 0)
                    if pkt_count > 5:  # Ignore very rare occurrences
                        self._anomalies.append({
                            'type': 'unusual_protocol',
                            'severity': 'info',
                            'title': f'Unusual Protocol Detected: {proto}',
                            'description': (
                                f'Protocol "{proto}" detected with {pkt_count} packets '
                                f'and {_format_bytes(proto_stat.get("byte_count", 0))} traffic. '
                                f'This protocol is not commonly seen on the network.'
                            ),
                            'protocol': proto,
                            'value': pkt_count,
                        })

            return list(self._anomalies)


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
