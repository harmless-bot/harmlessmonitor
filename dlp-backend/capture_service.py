import threading
import asyncio
import uuid
import socket
from datetime import datetime
from collections import defaultdict
from scapy.all import sniff, IP, TCP, UDP, Raw
from typing import Dict, Any

# Simple flow tracker in memory
active_flows: Dict[str, Any] = {}
flow_lock = threading.Lock()

def get_service_label(port: int) -> str:
    services = {
        80: "HTTP",
        443: "HTTPS (TLS)",
        22: "SSH",
        53: "DNS",
        3306: "MySQL",
        5432: "PostgreSQL",
    }
    return services.get(port, f"Port {port}")

def resolve_ip(ip: str) -> str:
    try:
        # Avoid blocking lookup for every packet, in a real app use async DNS or cache
        # For simplicity, we just return the IP or a basic mock if it's local
        if ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("127."):
            return "Local Network"
        return ip
    except Exception:
        return ip

def process_packet(packet, event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    if not IP in packet:
        return
        
    src_ip = packet[IP].src
    dst_ip = packet[IP].dst
    
    payload = ""
    if Raw in packet:
        try:
            payload = packet[Raw].load.decode('utf-8', errors='ignore')
        except:
            pass

    # We only care about TCP/UDP for simple flow tracking
    if TCP in packet:
        src_port = packet[TCP].sport
        dst_port = packet[TCP].dport
        protocol = "TCP"
    elif UDP in packet:
        src_port = packet[UDP].sport
        dst_port = packet[UDP].dport
        protocol = "UDP"
    else:
        return

    # Normalize flow key so A->B and B->A map to same flow
    if src_ip < dst_ip:
        flow_key = f"{src_ip}:{src_port}-{dst_ip}:{dst_port}-{protocol}"
    else:
        flow_key = f"{dst_ip}:{dst_port}-{src_ip}:{src_port}-{protocol}"
    
    packet_len = len(packet)

    with flow_lock:
        if flow_key not in active_flows:
            flow_id = str(uuid.uuid4())
            active_flows[flow_key] = {
                "flow_id": flow_id,
                "timestamp_start": datetime.utcnow().isoformat(),
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "dst_port": dst_port if src_ip < dst_ip else src_port,
                "protocol": protocol,
                "resolved_site": resolve_ip(dst_ip),
                "service_label": get_service_label(dst_port if src_ip < dst_ip else src_port),
                "organization": "Unknown",
                "country": "Unknown",
                "bytes_out": packet_len,
                "bytes_in": 0,
                "packet_count": 1,
                "risk_score": 0,
                "risk_level": "low",
                "flags": [],
                "payload_snippets": [payload] if payload else []
            }
            # Only push NEW flows to the queue immediately to notify UI
            asyncio.run_coroutine_threadsafe(
                event_queue.put({"type": "new_flow", "flow": active_flows[flow_key]}),
                loop
            )
        else:
            flow = active_flows[flow_key]
            
            is_outbound = (src_ip == flow["src_ip"])
            if is_outbound:
                flow["bytes_out"] += packet_len
            else:
                flow["bytes_in"] += packet_len
                
            flow["packet_count"] += 1
            
            payload_added = False
            if payload and len(flow.get("payload_snippets", [])) < 10:
                flow["payload_snippets"].append(payload)
                payload_added = True

            # Push updates immediately if a payload was added (for DLP detection), or periodically
            if payload_added or flow["packet_count"] % 10 == 0:
                asyncio.run_coroutine_threadsafe(
                    event_queue.put({"type": "update_flow", "flow": flow}),
                    loop
                )

def start_capture_thread(event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    print("Starting Scapy sniffer thread...")
    try:
        # Sniff on all interfaces (or default). Requires sudo!
        sniff(prn=lambda pkt: process_packet(pkt, event_queue, loop), store=False)
    except Exception as e:
        print(f"Scapy capture error (Did you run with sudo?): {e}")

def get_all_flows():
    with flow_lock:
        return list(active_flows.values())
