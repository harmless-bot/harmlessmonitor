import type { Flow } from '../types';

export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export const getDestinationIdentity = (flow: Flow) => {
  const isValid = (val?: string) => val && val !== 'Unknown' && val !== flow.dst_ip;
  
  const identity = 
    (isValid(flow.enriched_provider) ? flow.enriched_provider : null) ||
    (isValid(flow.organization) ? flow.organization : null) ||
    (isValid(flow.resolved_site) ? flow.resolved_site : null) ||
    (isValid(flow.domain) ? flow.domain : null) ||
    (isValid(flow.service_label) ? flow.service_label : null);
    
  if (identity) return identity;
  
  return flow.dst_ip || `Unresolved destination (${flow.unresolved_reason || 'identity not exposed by telemetry'})`;
};

export const getConfidenceLabel = (flow: Flow) => {
  switch (flow.geo_confidence) {
    case 'exact_geo':
      return 'Exact geo';
    case 'approximate_geo':
      return 'Approximate geo';
    case 'asn_region':
      return 'ASN-level region';
    case 'private_local':
      return 'Private/local';
    case 'cdn_anycast':
      return 'CDN/anycast';
    case 'unresolved':
      return 'Unresolved';
    default:
      return flow.confidence_score ? 'Resolved' : 'Needs enrichment';
  }
};

export const getRiskColorClass = (level: Flow['risk_level']) => {
  switch (level) {
    case 'critical':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'high':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'medium':
      return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30';
    default:
      return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
  }
};

export const buildAnalystNarrative = (flow: Flow, question?: string, provider = 'local heuristic analyst') => {
  const identity = getDestinationIdentity(flow);
  const indicators = flow.strongest_indicators?.length ? flow.strongest_indicators : flow.flags;
  const fp = flow.false_positive_possibilities?.length
    ? flow.false_positive_possibilities.join('; ')
    : 'Legitimate business transfer remains possible until process owner and destination intent are verified.';

  return [
    `Analysis via ${provider.toUpperCase()}`,
    '',
    `Verdict: ${flow.risk_level.toUpperCase()} (${flow.risk_score}/100) for ${identity}.`,
    `Why flagged: ${(flow.why_flagged || [flow.detection_reason || 'Telemetry matched exfiltration heuristics.']).join(' ')}`,
    `Strongest indicators: ${indicators.join(', ') || 'No strong indicators available.'}`,
    `Data shape: ${formatBytes(flow.bytes_out)} outbound vs ${formatBytes(flow.bytes_in)} inbound over ${flow.protocol}/${flow.dst_port}.`,
    `Identity confidence: ${getConfidenceLabel(flow)}${flow.confidence_score ? ` (${flow.confidence_score}%)` : ''} from ${flow.resolution_source || 'available telemetry'}.`,
    flow.unresolved_reason ? `Unresolved reason: ${flow.unresolved_reason}` : '',
    `False-positive possibilities: ${fp}`,
    `Recommended next step: ${flow.recommended_steps || 'Validate process ownership, destination legitimacy, and transferred object names.'}`,
    question ? `Analyst question considered: ${question}` : ''
  ].filter(Boolean).join('\n');
};

export const makeIocBundle = (flow: Flow) => [
  `dst_ip=${flow.dst_ip}`,
  flow.domain ? `domain=${flow.domain}` : '',
  flow.resolved_site ? `service=${flow.resolved_site}` : '',
  flow.asn ? `asn=${flow.asn}` : '',
  `port=${flow.dst_port}`,
  `protocol=${flow.protocol}`,
  `risk=${flow.risk_level}:${flow.risk_score}`
].filter(Boolean).join('\n');
