"""
NetPulse Capture Engine — Packet Parser
Extracts useful fields from raw Scapy packets
"""
from datetime import datetime, timezone


def parse_packet(packet):
    """
    Extract relevant fields from a Scapy packet.
    Returns a dict with standardized fields or None if the packet can't be parsed.
    """
    try:
        from scapy.layers.inet import IP, TCP, UDP, ICMP
        from scapy.layers.l2 import Ether, ARP
        from scapy.layers.dns import DNS

        result = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'src_ip': None,
            'dst_ip': None,
            'protocol': 'UNKNOWN',
            'src_port': None,
            'dst_port': None,
            'size': len(packet),
            'ttl': None,
            'flags': None,
            'info': '',
            'src_mac': None,
            'dst_mac': None,
        }

        # Layer 2 — Ethernet
        if packet.haslayer(Ether):
            result['src_mac'] = packet[Ether].src
            result['dst_mac'] = packet[Ether].dst

        # ARP
        if packet.haslayer(ARP):
            arp = packet[ARP]
            result['protocol'] = 'ARP'
            result['src_ip'] = arp.psrc
            result['dst_ip'] = arp.pdst
            result['info'] = f"ARP {'Request' if arp.op == 1 else 'Reply'}: Who has {arp.pdst}? Tell {arp.psrc}"
            return result

        # Layer 3 — IP
        if packet.haslayer(IP):
            ip = packet[IP]
            result['src_ip'] = ip.src
            result['dst_ip'] = ip.dst
            result['ttl'] = ip.ttl

            # Layer 4 — TCP
            if packet.haslayer(TCP):
                tcp = packet[TCP]
                result['protocol'] = 'TCP'
                result['src_port'] = tcp.sport
                result['dst_port'] = tcp.dport
                result['flags'] = str(tcp.flags)

                # Identify common services
                service = _identify_service(tcp.sport, tcp.dport)
                if service:
                    result['info'] = service

                # DNS over TCP
                if packet.haslayer(DNS):
                    result['protocol'] = 'DNS'
                    dns = packet[DNS]
                    result['info'] = f"DNS Query: {dns.qd.qname.decode() if dns.qd else 'N/A'}"

            # Layer 4 — UDP
            elif packet.haslayer(UDP):
                udp = packet[UDP]
                result['protocol'] = 'UDP'
                result['src_port'] = udp.sport
                result['dst_port'] = udp.dport

                # DNS
                if packet.haslayer(DNS):
                    result['protocol'] = 'DNS'
                    dns = packet[DNS]
                    if dns.qd:
                        try:
                            qname = dns.qd.qname.decode()
                        except Exception:
                            qname = str(dns.qd.qname)
                        result['info'] = f"DNS {'Response' if dns.qr else 'Query'}: {qname}"

                # Identify common services
                service = _identify_service(udp.sport, udp.dport)
                if service and not result['info']:
                    result['info'] = service

            # ICMP
            elif packet.haslayer(ICMP):
                icmp = packet[ICMP]
                result['protocol'] = 'ICMP'
                icmp_types = {0: 'Echo Reply', 3: 'Destination Unreachable',
                              8: 'Echo Request', 11: 'Time Exceeded'}
                result['info'] = icmp_types.get(icmp.type, f'Type {icmp.type}')

            else:
                result['protocol'] = f'IP-{ip.proto}'

        else:
            # Non-IP packet
            result['src_ip'] = '0.0.0.0'
            result['dst_ip'] = '0.0.0.0'
            result['protocol'] = 'OTHER'

        return result

    except Exception as e:
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'src_ip': '0.0.0.0',
            'dst_ip': '0.0.0.0',
            'protocol': 'ERROR',
            'src_port': None,
            'dst_port': None,
            'size': len(packet) if packet else 0,
            'ttl': None,
            'flags': None,
            'info': f'Parse error: {str(e)}',
            'src_mac': None,
            'dst_mac': None,
        }


def _identify_service(sport, dport):
    """Identify well-known services by port number."""
    services = {
        20: 'FTP Data', 21: 'FTP Control', 22: 'SSH', 23: 'Telnet',
        25: 'SMTP', 53: 'DNS', 67: 'DHCP Server', 68: 'DHCP Client',
        80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
        445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
        3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
        5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt',
        27017: 'MongoDB',
    }

    # Check destination port first (more likely to identify the service)
    if dport in services:
        return services[dport]
    if sport in services:
        return services[sport]
    return None
