use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{SinkExt, StreamExt};
use serde::{Serialize, Deserialize};

use crate::classifier::PacketClassification;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FlowStat {
    pub flow_id: String,
    pub src: String,
    pub dst: String,
    pub bandwidth_bps: u64,
    pub sensitive_count: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum WsMessage {
    #[serde(rename = "stats")]
    Stats {
        packets_total: usize,
        sensitive_total: usize,
        flows: Vec<FlowStat>,
    },
    #[serde(rename = "packet")]
    Packet {
        data: PacketClassification
    },
}

pub struct AppState {
    pub packets_total: usize,
    pub sensitive_total: usize,
    pub flows: HashMap<String, FlowStat>,
}

type ClientList = Arc<Mutex<Vec<mpsc::Sender<Message>>>>;

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum WsIncomingMessage {
    #[serde(rename = "UPDATE_RULES")]
    UpdateRules {
        rules: Vec<crate::patterns::RuleConfig>
    }
}

pub async fn run_server(port: u16, mut rx: mpsc::Receiver<PacketClassification>) {
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
    println!("WebSocket server listening on ws://{}", addr);

    let state = Arc::new(Mutex::new(AppState {
        packets_total: 0,
        sensitive_total: 0,
        flows: HashMap::new(),
    }));

    let clients: ClientList = Arc::new(Mutex::new(Vec::new()));

    let state_clone = state.clone();
    let clients_clone = clients.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
        loop {
            interval.tick().await;
            let s = state_clone.lock().await;
            let msg = WsMessage::Stats {
                packets_total: s.packets_total,
                sensitive_total: s.sensitive_total,
                flows: s.flows.values().cloned().collect(),
            };
            if let Ok(json) = serde_json::to_string(&msg) {
                let mut c = clients_clone.lock().await;
                let mut retain = Vec::new();
                for tx in c.iter() {
                    if tx.send(Message::Text(json.clone())).await.is_ok() {
                        retain.push(tx.clone());
                    }
                }
                *c = retain;
            }
        }
    });

    let state_clone2 = state.clone();
    let clients_clone2 = clients.clone();
    tokio::spawn(async move {
        while let Some(packet) = rx.recv().await {
            let mut s = state_clone2.lock().await;
            s.packets_total += 1;
            if packet.is_sensitive {
                s.sensitive_total += 1;
            }
            
            let flow = s.flows.entry(packet.flow_id.clone()).or_insert_with(|| FlowStat {
                flow_id: packet.flow_id.clone(),
                src: packet.src_ip.clone(),
                dst: packet.dst_ip.clone(),
                bandwidth_bps: 0,
                sensitive_count: 0,
            });
            flow.bandwidth_bps += (packet.payload_size as u64) * 8;
            if packet.is_sensitive {
                flow.sensitive_count += 1;
            }

            if packet.is_sensitive {
                let msg = WsMessage::Packet { data: packet };
                if let Ok(json) = serde_json::to_string(&msg) {
                    let mut c = clients_clone2.lock().await;
                    let mut retain = Vec::new();
                    for tx in c.iter() {
                        if tx.send(Message::Text(json.clone())).await.is_ok() {
                            retain.push(tx.clone());
                        }
                    }
                    *c = retain;
                }
            }
        }
    });

    while let Ok((stream, _)) = listener.accept().await {
        let clients = clients.clone();
        tokio::spawn(async move {
            if let Ok(ws_stream) = accept_async(stream).await {
                let (tx, rx_mpsc) = mpsc::channel(100);
                clients.lock().await.push(tx);
                let (mut write, mut read) = ws_stream.split();
                
                let mut rx_mpsc = rx_mpsc;
                tokio::spawn(async move {
                    while let Some(msg) = rx_mpsc.recv().await {
                        if write.send(msg).await.is_err() {
                            break;
                        }
                    }
                });

                while let Some(msg_res) = read.next().await {
                    if let Ok(Message::Text(text)) = msg_res {
                        if let Ok(incoming) = serde_json::from_str::<WsIncomingMessage>(&text) {
                            match incoming {
                                WsIncomingMessage::UpdateRules { rules } => {
                                    crate::patterns::update_rules(rules);
                                    println!("Rules updated from frontend.");
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}

