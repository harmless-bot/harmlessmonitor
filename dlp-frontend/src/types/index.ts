export interface Flow {
  flow_id: string;
  timestamp_start: string;
  timestamp_end?: string;
  src_ip: string;
  src_port?: number;
  dst_ip: string;
  dst_port: number;
  protocol: string;
  resolved_site?: string;
  domain?: string;
  service_label?: string;
  organization?: string;
  asn?: string;
  country?: string;
  region?: string;
  lat?: number;
  lon?: number;
  geo_confidence?: 'exact_geo' | 'approximate_geo' | 'asn_region' | 'private_local' | 'cdn_anycast' | 'unresolved';
  confidence_score?: number;
  resolution_source?: string;
  unresolved_reason?: string;
  threat_score?: number;
  enriched_provider?: string;
  enriched_usage_type?: string;
  enriched_asn?: string;
  enriched_threat_tags?: string[];
  bytes_out: number;
  bytes_in: number;
  packet_count: number;
  process_name?: string;
  first_seen?: boolean;
  last_seen?: string;
  analyst_note?: string;
  allowlist_status?: 'unreviewed' | 'allowed' | 'benign' | 'suspicious';
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  why_flagged?: string[];
  strongest_indicators?: string[];
  false_positive_possibilities?: string[];
  recommended_steps?: string;
  detection_reason?: string;
  simulated?: boolean;
  matches?: PatternMatch[];
  is_sensitive?: boolean;
  timestamp_ms?: number;
}

// Keeping these for legacy components during migration
export interface PatternMatch {
  pattern_name: string;
  severity: number;
  category: string;
  snippet: string;
}

export interface PacketClassification {
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  payload_size: number;
  matches: PatternMatch[];
  is_sensitive: boolean;
  timestamp_ms: number;
  flow_id: string;
}

export interface FlowStat {
  flow_id: string;
  src: string;
  dst: string;
  bandwidth_bps: number;
  sensitive_count: number;
}

export interface SystemStats {
  packets_total: number;
  sensitive_total: number;
  flows: FlowStat[];
  fps?: number;
  latency_ms?: number;
}

export interface FlowHistoryItem extends FlowStat {
  timestamp_ms: number;
  protocol: string;
  is_threat: boolean;
}
