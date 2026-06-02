use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PatternMatch {
    pub pattern_name: String,
    pub severity: u8,
    pub category: String,
    pub snippet: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PacketClassification {
    pub src_ip: String,
    pub dst_ip: String,
    pub src_port: u16,
    pub dst_port: u16,
    pub protocol: String,
    pub payload_size: usize,
    pub matches: Vec<PatternMatch>,
    pub is_sensitive: bool,
    pub timestamp_ms: u64,
    pub flow_id: String,
}
