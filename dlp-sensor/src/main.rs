mod patterns;
mod classifier;
mod ws_server;

use clap::Parser;
use pcap::Device;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use etherparse::{SlicedPacket, TransportSlice, InternetSlice};

use classifier::{PacketClassification, PatternMatch};
use patterns::PATTERNS;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long, default_value = "en0")]
    interface: String,

    #[arg(long, default_value_t = 9001)]
    ws_port: u16,

    #[arg(short, long)]
    promiscuous: bool,
}

fn check_payload(payload: &str) -> Vec<PatternMatch> {
    let mut matches = Vec::new();
    let patterns = PATTERNS.read().unwrap();
    
    for p in patterns.iter() {
        if !p.enabled { continue; }
        
        if p.id == "EMAIL_BULK" {
            if let Some(re) = &p.regex {
                let count = re.find_iter(payload).count();
                if count > 5 {
                    matches.push(PatternMatch {
                        pattern_name: p.name.to_string(),
                        severity: p.severity,
                        category: p.category.to_string(),
                        snippet: format!("Found {} emails", count),
                    });
                }
            }
        } else if let Some(re) = &p.regex {
            if let Some(m) = re.find(payload) {
                let mut snippet = m.as_str().to_string();
                if snippet.len() > 40 {
                    snippet.truncate(40);
                }
                matches.push(PatternMatch {
                    pattern_name: p.name.to_string(),
                    severity: p.severity,
                    category: p.category.to_string(),
                    snippet,
                });
            }
        }
    }
    matches
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    let (tx, rx) = mpsc::channel(100);

    let ws_port = args.ws_port;
    tokio::spawn(async move {
        ws_server::run_server(ws_port, rx).await;
    });

    println!("Starting live capture on default device...");
    let device = match Device::lookup().expect("device lookup failed") {
        Some(d) => d,
        None => panic!("No device found"),
    };
    
    println!("Capturing from: {}", device.name);
    
    let mut cap = match pcap::Capture::from_device(device).unwrap().promisc(args.promiscuous).timeout(10).open() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to open device. You may need to run this with sudo! Error: {}", e);
            return;
        }
    };
    
    if let Err(e) = cap.filter("tcp or udp", true) {
        eprintln!("Failed to set filter: {}", e);
    }
    
    loop {
        if let Ok(packet) = cap.next_packet() {
            match SlicedPacket::from_ethernet(&packet.data) {
                Ok(value) => {
                    let mut src_ip = "unknown".to_string();
                    let mut dst_ip = "unknown".to_string();
                    let mut src_port = 0;
                    let mut dst_port = 0;
                    let mut protocol = "UNKNOWN".to_string();

                    if let Some(ip) = value.net {
                        match ip {
                            InternetSlice::Ipv4(ipv4) => {
                                src_ip = ipv4.header().source_addr().to_string();
                                dst_ip = ipv4.header().destination_addr().to_string();
                            }
                            InternetSlice::Ipv6(ipv6) => {
                                src_ip = ipv6.header().source_addr().to_string();
                                dst_ip = ipv6.header().destination_addr().to_string();
                            }
                            _ => {}
                        }
                    }

                    if let Some(transport) = value.transport {
                        match transport {
                            TransportSlice::Tcp(tcp) => {
                                protocol = "TCP".to_string();
                                src_port = tcp.source_port();
                                dst_port = tcp.destination_port();
                            }
                            TransportSlice::Udp(udp) => {
                                protocol = "UDP".to_string();
                                src_port = udp.source_port();
                                dst_port = udp.destination_port();
                            }
                            _ => {}
                        }
                    }

                    let payload = String::from_utf8_lossy(&packet.data);
                    
                    // Whitelist loopback and test traffic
                    if src_ip == dst_ip || payload.lines().any(|l| l.trim() == "4111111111111111") {
                        continue;
                    }

                    let matches = check_payload(&payload);
                    
                    let is_sensitive = !matches.is_empty();
                    let flow_id = format!("{}:{}-{}:{}", src_ip, src_port, dst_ip, dst_port);
                    
                    let p = PacketClassification {
                        src_ip,
                        dst_ip,
                        src_port,
                        dst_port,
                        protocol,
                        payload_size: packet.header.len as usize,
                        matches,
                        is_sensitive,
                        timestamp_ms: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64,
                        flow_id,
                    };
                    
                    let _ = tx.try_send(p);
                }
                Err(_) => {}
            }
        }
    }
}
