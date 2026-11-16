"""
NetPulse — PCAP Pre-processor
Parses real PCAP files into a JSON dataset for realistic replay.
Run once: python pcap_preprocess.py
"""
import struct
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'real_packets.json')


def parse_pcap(filepath):
    """Parse a PCAP file using raw struct (no external dependencies)."""
    packets = []
    try:
        with open(filepath, 'rb') as f:
            magic = f.read(4)
            if len(magic) < 4:
                return []
            if magic == b'\xd4\xc3\xb2\xa1':
                endian = '<'
            elif magic == b'\xa1\xb2\xc3\xd4':
                endian = '>'
            else:
                return []

            hdr = f.read(20)
            ver_major, ver_minor, _, _, snaplen, linktype = struct.unpack(endian + 'HHIIII', hdr)

            while True:
                pkt_hdr = f.read(16)
                if len(pkt_hdr) < 16:
                    break
                ts_sec, ts_usec, incl_len, orig_len = struct.unpack(endian + 'IIII', pkt_hdr)
                pkt_data = f.read(incl_len)
                if len(pkt_data) < incl_len:
                    break

                info = {
                    'ts': ts_sec + ts_usec / 1e6,
                    'size': orig_len,
                    'src_ip': None, 'dst_ip': None,
                    'protocol': 'UNKNOWN',
                    'src_port': None, 'dst_port': None,
                    'ttl': None, 'flags': None,
                    'src_mac': None, 'dst_mac': None,
                    'info': '',
                }

                offset = 0
                ethertype = 0

                if linktype == 1 and len(pkt_data) >= 14:
                    info['dst_mac'] = ':'.join(f'{b:02X}' for b in pkt_data[0:6])
                    info['src_mac'] = ':'.join(f'{b:02X}' for b in pkt_data[6:12])
                    ethertype = struct.unpack('>H', pkt_data[12:14])[0]
                    offset = 14
                    if ethertype == 0x8100 and len(pkt_data) >= offset + 4:
                        ethertype = struct.unpack('>H', pkt_data[offset + 2:offset + 4])[0]
                        offset += 4

                if ethertype == 0x0806:
                    info['protocol'] = 'ARP'
                    if len(pkt_data) >= offset + 28:
                        sender_ip = '.'.join(str(b) for b in pkt_data[offset + 14:offset + 18])
                        target_ip = '.'.join(str(b) for b in pkt_data[offset + 24:offset + 28])
                        info['src_ip'] = sender_ip
                        info['dst_ip'] = target_ip
                        info['info'] = f'ARP: Who has {target_ip}? Tell {sender_ip}'

                elif ethertype == 0x86DD:
                    info['protocol'] = 'IPv6'
                    # Skip IPv6 for now — focus on IPv4

                elif ethertype == 0x0800 and len(pkt_data) >= offset + 20:
                    ihl = (pkt_data[offset] & 0x0F) * 4
                    ttl = pkt_data[offset + 8]
                    proto_num = pkt_data[offset + 9]
                    src_ip = '.'.join(str(b) for b in pkt_data[offset + 12:offset + 16])
                    dst_ip = '.'.join(str(b) for b in pkt_data[offset + 16:offset + 20])

                    info['src_ip'] = src_ip
                    info['dst_ip'] = dst_ip
                    info['ttl'] = ttl

                    ip_offset = offset + ihl

                    if proto_num == 6 and len(pkt_data) >= ip_offset + 14:
                        src_port, dst_port = struct.unpack('>HH', pkt_data[ip_offset:ip_offset + 4])
                        flags_byte = pkt_data[ip_offset + 13]
                        flag_str = ''
                        if flags_byte & 0x02: flag_str += 'S'
                        if flags_byte & 0x10: flag_str += 'A'
                        if flags_byte & 0x08: flag_str += 'P'
                        if flags_byte & 0x01: flag_str += 'F'
                        if flags_byte & 0x04: flag_str += 'R'

                        info['src_port'] = src_port
                        info['dst_port'] = dst_port
                        info['flags'] = flag_str

                        if dst_port == 443 or src_port == 443:
                            info['protocol'] = 'HTTPS'
                            info['info'] = 'TLS/SSL'
                        elif dst_port == 80 or src_port == 80:
                            info['protocol'] = 'HTTP'
                            info['info'] = 'HTTP'
                        elif dst_port == 22 or src_port == 22:
                            info['protocol'] = 'SSH'
                            info['info'] = 'SSH session'
                        elif dst_port == 25 or src_port == 25:
                            info['protocol'] = 'SMTP'
                            info['info'] = 'SMTP mail'
                        elif dst_port == 8443 or src_port == 8443:
                            info['protocol'] = 'HTTPS'
                            info['info'] = 'HTTPS (alt port 8443)'
                        elif dst_port == 8080 or src_port == 8080:
                            info['protocol'] = 'HTTP'
                            info['info'] = 'HTTP proxy (8080)'
                        elif dst_port == 3389 or src_port == 3389:
                            info['protocol'] = 'RDP'
                            info['info'] = 'Remote Desktop'
                        else:
                            info['protocol'] = 'TCP'
                            info['info'] = f'TCP {src_port} → {dst_port} [{flag_str}]'

                    elif proto_num == 17 and len(pkt_data) >= ip_offset + 8:
                        src_port, dst_port = struct.unpack('>HH', pkt_data[ip_offset:ip_offset + 4])
                        info['src_port'] = src_port
                        info['dst_port'] = dst_port

                        if dst_port == 53 or src_port == 53:
                            info['protocol'] = 'DNS'
                            info['info'] = 'DNS query/response'
                        elif dst_port == 5353 or src_port == 5353:
                            info['protocol'] = 'mDNS'
                            info['info'] = 'Multicast DNS'
                        elif dst_port in (67, 68) or src_port in (67, 68):
                            info['protocol'] = 'DHCP'
                            info['info'] = 'DHCP discovery/offer'
                        elif dst_port == 123 or src_port == 123:
                            info['protocol'] = 'NTP'
                            info['info'] = 'Network Time Protocol'
                        elif dst_port == 161 or src_port == 161:
                            info['protocol'] = 'SNMP'
                            info['info'] = 'SNMP monitoring'
                        elif dst_port == 514 or src_port == 514:
                            info['protocol'] = 'Syslog'
                            info['info'] = 'Syslog'
                        else:
                            info['protocol'] = 'UDP'
                            info['info'] = f'UDP {src_port} → {dst_port}'

                    elif proto_num == 1:
                        info['protocol'] = 'ICMP'
                        if len(pkt_data) >= ip_offset + 2:
                            icmp_type = pkt_data[ip_offset]
                            if icmp_type == 8:
                                info['info'] = 'Echo Request (ping)'
                            elif icmp_type == 0:
                                info['info'] = 'Echo Reply'
                            elif icmp_type == 3:
                                info['info'] = 'Destination Unreachable'
                            elif icmp_type == 11:
                                info['info'] = 'Time Exceeded (traceroute)'
                            else:
                                info['info'] = f'ICMP type {icmp_type}'
                    elif proto_num == 2:
                        info['protocol'] = 'IGMP'
                        info['info'] = 'IGMP multicast'
                    elif proto_num == 47:
                        info['protocol'] = 'GRE'
                        info['info'] = 'GRE tunnel'
                    elif proto_num == 50:
                        info['protocol'] = 'ESP'
                        info['info'] = 'IPSec ESP'
                    else:
                        info['protocol'] = f'IP-{proto_num}'

                # Skip IPv6-only and unknown packets
                if info['src_ip'] is None and info['protocol'] not in ('ARP',):
                    continue

                packets.append(info)

    except Exception as e:
        print(f'  Error parsing {filepath}: {e}', file=sys.stderr)

    return packets


def main():
    all_packets = []

    pcap_files = [f for f in os.listdir(DATA_DIR)
                  if f.endswith(('.pcap', '.cap')) and not f.startswith('.')]

    if not pcap_files:
        print('No PCAP files found in data/ directory')
        return

    for pcap_file in sorted(pcap_files):
        filepath = os.path.join(DATA_DIR, pcap_file)
        print(f'Parsing {pcap_file}...')
        packets = parse_pcap(filepath)

        # Filter out IPv6-only and incomplete records
        valid = [p for p in packets if p.get('src_ip') and p['protocol'] != 'IPv6']
        all_packets.extend(valid)

        protos = {}
        for p in valid:
            pr = p['protocol']
            protos[pr] = protos.get(pr, 0) + 1
        for pr, cnt in sorted(protos.items(), key=lambda x: -x[1]):
            print(f'  {pr}: {cnt}')
        print(f'  → {len(valid)} usable packets extracted')

    # Sort by timestamp
    all_packets.sort(key=lambda p: p.get('ts', 0))

    # Compute inter-packet deltas
    for i in range(1, len(all_packets)):
        all_packets[i]['delta'] = all_packets[i]['ts'] - all_packets[i - 1]['ts']
    if all_packets:
        all_packets[0]['delta'] = 0.0

    # Write output
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_packets, f, indent=None)

    print(f'\n=== Total: {len(all_packets)} real packets → {OUTPUT_FILE}')

    # Protocol summary
    total_protos = {}
    for p in all_packets:
        pr = p['protocol']
        total_protos[pr] = total_protos.get(pr, 0) + 1
    print('\nProtocol distribution:')
    for pr, cnt in sorted(total_protos.items(), key=lambda x: -x[1]):
        pct = cnt / len(all_packets) * 100
        print(f'  {pr}: {cnt} ({pct:.1f}%)')

    # Size statistics
    sizes = [p['size'] for p in all_packets]
    print(f'\nPacket sizes: min={min(sizes)}, max={max(sizes)}, avg={sum(sizes)/len(sizes):.0f}')

    # Unique IPs
    ips = set()
    for p in all_packets:
        if p['src_ip']:
            ips.add(p['src_ip'])
        if p['dst_ip']:
            ips.add(p['dst_ip'])
    print(f'Unique IPs: {len(ips)}')


if __name__ == '__main__':
    main()

