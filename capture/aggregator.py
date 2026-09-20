"""
NetPulse Capture Engine — Flow Aggregator
Maintains rolling statistics and aggregates packet data into flows
"""
import time
import threading
from collections import defaultdict
from datetime import datetime, timezone


class FlowAggregator:
    """
    Aggregates individual packets into flows and computes statistics.
    Thread-safe for concurrent access from sniffer and flush threads.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._start_time = time.time()

        # Flow tracking: key = (src_ip, dst_ip, protocol, src_port, dst_port)
        self._flows = {}

        # Per-device stats: key = ip
        self._device_bytes_sent = defaultdict(int)
        self._device_bytes_recv = defaultdict(int)
        self._device_packet_count = defaultdict(int)
        self._device_last_seen = {}
        self._device_macs = {}

        # Protocol stats
        self._protocol_bytes = defaultdict(int)
        self._protocol_packets = defaultdict(int)

        # Port stats
        self._port_bytes = defaultdict(int)
        self._port_connections = defaultdict(int)

        # Bandwidth tracking
        self._interval_bytes = 0
        self._interval_packets = 0
        self._interval_start = time.time()

        # Rolling bandwidth history (last 60 values)
        self._bandwidth_history = []

        # Packet buffer for sending to API
        self._packet_buffer = []

    def add_packet(self, parsed):
        """Add a parsed packet to the aggregator."""
        with self._lock:
            src_ip = parsed.get('src_ip', '0.0.0.0')
            dst_ip = parsed.get('dst_ip', '0.0.0.0')
            protocol = parsed.get('protocol', 'UNKNOWN')
            src_port = parsed.get('src_port')
            dst_port = parsed.get('dst_port')
            size = parsed.get('size', 0)
            timestamp = parsed.get('timestamp', datetime.now(timezone.utc).isoformat())

            # ── Update flows ──
            flow_key = (src_ip, dst_ip, protocol,
                        src_port or 0, dst_port or 0)
            if flow_key in self._flows:
                flow = self._flows[flow_key]
                flow['total_bytes'] += size
                flow['packet_count'] += 1
                flow['last_seen'] = timestamp
            else:
                self._flows[flow_key] = {
                    'src_ip': src_ip,
                    'dst_ip': dst_ip,
                    'protocol': protocol,
                    'src_port': src_port or 0,
                    'dst_port': dst_port or 0,
                    'total_bytes': size,
                    'packet_count': 1,
                    'first_seen': timestamp,
                    'last_seen': timestamp,
                }

            # ── Update device stats ──
            self._device_bytes_sent[src_ip] += size
            self._device_bytes_recv[dst_ip] += size
            self._device_packet_count[src_ip] += 1
            self._device_packet_count[dst_ip] += 1
            self._device_last_seen[src_ip] = timestamp
            self._device_last_seen[dst_ip] = timestamp

            if parsed.get('src_mac'):
                self._device_macs[src_ip] = parsed['src_mac']
            if parsed.get('dst_mac'):
                self._device_macs[dst_ip] = parsed['dst_mac']

            # ── Update protocol stats ──
            self._protocol_bytes[protocol] += size
            self._protocol_packets[protocol] += 1

            # ── Update port stats ──
            if dst_port:
                port_key = (dst_port, protocol)
                self._port_bytes[port_key] += size
                self._port_connections[port_key] += 1

            # ── Update bandwidth counters ──
            self._interval_bytes += size
            self._interval_packets += 1

            # ── Buffer packet for API ──
            self._packet_buffer.append({
                'timestamp': timestamp,
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'protocol': protocol,
                'src_port': src_port,
                'dst_port': dst_port,
                'size': size,
                'ttl': parsed.get('ttl'),
                'flags': parsed.get('flags'),
            })

    def flush(self):
        """
        Flush current aggregated data and return it.
        Resets interval counters but keeps cumulative device/flow data.
        Returns dict with all stats for DB insertion and API push.
        """
        with self._lock:
            now = time.time()
            elapsed = max(now - self._interval_start, 0.1)

            bytes_per_sec = int(self._interval_bytes / elapsed)
            packets_per_sec = int(self._interval_packets / elapsed)

            # Build bandwidth record
            bandwidth = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'bytes_per_sec': bytes_per_sec,
                'packets_per_sec': packets_per_sec,
                'active_devices': len(set(
                    list(self._device_bytes_sent.keys()) +
                    list(self._device_bytes_recv.keys())
                )),
            }
            self._bandwidth_history.append(bandwidth)
            if len(self._bandwidth_history) > 60:
                self._bandwidth_history = self._bandwidth_history[-60:]

            # Build flows list
            flows = list(self._flows.values())

            # Build device stats
            all_ips = set(
                list(self._device_bytes_sent.keys()) +
                list(self._device_bytes_recv.keys())
            )
            devices = []
            for ip in all_ips:
                if ip == '0.0.0.0':
                    continue
                devices.append({
                    'ip': ip,
                    'mac_address': self._device_macs.get(ip),
                    'total_bytes_sent': self._device_bytes_sent.get(ip, 0),
                    'total_bytes_recv': self._device_bytes_recv.get(ip, 0),
                    'packet_count': self._device_packet_count.get(ip, 0),
                    'last_seen': self._device_last_seen.get(ip),
                })

            # Build protocol stats
            protocols = [
                {
                    'protocol': proto,
                    'byte_count': self._protocol_bytes[proto],
                    'packet_count': self._protocol_packets[proto],
                }
                for proto in self._protocol_bytes
            ]

            # Build port stats
            ports = [
                {
                    'port': port,
                    'protocol': proto,
                    'byte_count': self._port_bytes[(port, proto)],
                    'connection_count': self._port_connections[(port, proto)],
                }
                for (port, proto) in self._port_bytes
            ]

            # Get buffered packets
            packets = list(self._packet_buffer)

            # Build summary
            summary = {
                'total_devices': len(all_ips),
                'active_devices': bandwidth['active_devices'],
                'current_bandwidth_bps': bytes_per_sec,
                'current_packets_per_sec': packets_per_sec,
                'total_bytes': sum(self._device_bytes_sent.values()),
                'total_packets': sum(self._device_packet_count.values()) // 2,
            }

            # Reset interval counters
            self._interval_bytes = 0
            self._interval_packets = 0
            self._interval_start = now
            self._packet_buffer = []

            return {
                'packets': packets,
                'flows': flows,
                'devices': devices,
                'protocols': protocols,
                'ports': ports,
                'bandwidth': bandwidth,
                'summary': summary,
                'bandwidth_history': list(self._bandwidth_history),
            }

    def get_device_packet_counts(self):
        """Get per-device packet counts for anomaly detection (thread-safe snapshot)."""
        with self._lock:
            return dict(self._device_packet_count)

    def get_device_port_sets(self):
        """Get per-device destination port sets for port scan detection."""
        with self._lock:
            device_ports = defaultdict(set)
            for (src, dst, proto, sport, dport), flow in self._flows.items():
                if dport and dport != 0:
                    device_ports[src].add(dport)
            return dict(device_ports)

    def get_bandwidth_history(self):
        """Get rolling bandwidth history."""
        with self._lock:
            return list(self._bandwidth_history)
