import { useEffect, useRef } from 'react';
import { useDlpStore } from '../store/useDlpStore';
import type { Flow } from '../types';

const WS_URL = 'ws://localhost:8000/ws/live';

const privateIp = (ip: string) => ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

const normalizeFlow = (input: Partial<Flow>): Flow => {
  const bytesOut = input.bytes_out ?? 0;
  const bytesIn = input.bytes_in ?? 0;
  const uploadRatio = bytesIn > 0 ? bytesOut / bytesIn : bytesOut > 0 ? 99 : 0;
  const flags = input.flags ?? [
    bytesOut > 100_000_000 ? 'large_outbound_transfer' : '',
    uploadRatio > 10 ? 'upload_heavy' : '',
    input.first_seen ? 'first_seen_destination' : '',
    input.unresolved_reason ? 'unresolved_encrypted' : ''
  ].filter(Boolean);
  const riskScore = input.risk_score ?? Math.min(100, Math.round(
    (bytesOut > 100_000_000 ? 35 : bytesOut > 25_000_000 ? 18 : 4) +
    (uploadRatio > 20 ? 20 : uploadRatio > 5 ? 10 : 0) +
    (input.first_seen ? 18 : 0) +
    (input.unresolved_reason ? 14 : 0) +
    (input.dst_port && ![80, 443, 53, 123].includes(input.dst_port) ? 10 : 0)
  ));
  const riskLevel: Flow['risk_level'] = input.risk_level ?? (
    riskScore >= 90 ? 'critical' : riskScore >= 70 ? 'high' : riskScore >= 35 ? 'medium' : 'low'
  );

  return {
    flow_id: input.flow_id ?? crypto.randomUUID(),
    timestamp_start: input.timestamp_start ?? new Date().toISOString(),
    timestamp_end: input.timestamp_end,
    src_ip: input.src_ip ?? 'local-host',
    src_port: input.src_port,
    dst_ip: input.dst_ip ?? 'unresolved',
    dst_port: input.dst_port ?? 443,
    protocol: input.protocol ?? 'TLS',
    resolved_site: input.resolved_site,
    domain: input.domain,
    service_label: input.service_label,
    organization: input.organization ?? (privateIp(input.dst_ip ?? '') ? 'Private RFC1918 network' : undefined),
    asn: input.asn,
    country: input.country ?? (privateIp(input.dst_ip ?? '') ? 'Internal' : undefined),
    region: input.region,
    lat: input.lat,
    lon: input.lon,
    geo_confidence: input.geo_confidence ?? (privateIp(input.dst_ip ?? '') ? 'private_local' : input.lat && input.lon ? 'approximate_geo' : 'unresolved'),
    confidence_score: input.confidence_score ?? (input.resolved_site || input.domain ? 80 : privateIp(input.dst_ip ?? '') ? 100 : 25),
    resolution_source: input.resolution_source ?? (input.domain ? 'Backend enrichment' : privateIp(input.dst_ip ?? '') ? 'Private IP classifier' : 'Destination IP only'),
    unresolved_reason: input.unresolved_reason ?? (!input.resolved_site && !input.domain && !privateIp(input.dst_ip ?? '') ? 'No DNS, SNI, reverse DNS, or configured enrichment provider returned an identity.' : undefined),
    bytes_out: bytesOut,
    bytes_in: bytesIn,
    packet_count: input.packet_count ?? 1,
    process_name: input.process_name ?? 'unknown-process',
    first_seen: input.first_seen ?? false,
    last_seen: input.last_seen ?? new Date().toISOString(),
    analyst_note: input.analyst_note,
    allowlist_status: input.allowlist_status ?? 'unreviewed',
    risk_score: riskScore,
    risk_level: riskLevel,
    flags,
    why_flagged: input.why_flagged ?? [flags.length ? flags.join(', ') : 'No high-risk exfiltration signals detected.'],
    strongest_indicators: input.strongest_indicators ?? flags.slice(0, 4),
    false_positive_possibilities: input.false_positive_possibilities ?? ['Legitimate business transfer or approved automation may explain this flow.'],
    recommended_steps: input.recommended_steps ?? 'Correlate process owner, DNS/SNI, and transferred object metadata before taking action.',
    detection_reason: input.detection_reason ?? flags.join(', '),
    simulated: false,
    matches: input.matches,
    is_sensitive: input.is_sensitive ?? riskLevel !== 'low',
    timestamp_ms: input.timestamp_ms ?? Date.now()
  };
};

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const setWsStatus = useDlpStore((state) => state.setWsStatus);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      setWsStatus('RECONNECTING');
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        setWsStatus('CONNECTED');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'flow_update') {
             useDlpStore.getState().addFlow(normalizeFlow(data.flow));
          } else if (data.type === 'heartbeat') {
             // connection alive
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      wsRef.current.onclose = () => {
        setWsStatus('OFFLINE');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);
}
