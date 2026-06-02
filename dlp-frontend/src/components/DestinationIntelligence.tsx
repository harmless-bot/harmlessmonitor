import { Globe2, HelpCircle, Layers3, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDlpStore } from '../store/useDlpStore';
import { formatBytes, getConfidenceLabel, getDestinationIdentity, getRiskColorClass } from '../utils/flowAnalysis';

export default function DestinationIntelligence() {
  const flows = useDlpStore(state => state.flows);
  const [searchTerm, setSearchTerm] = useState('');

  const destinations = useMemo(() => {
    const grouped = flows.reduce<Record<string, {
      identity: string;
      domains: Set<string>;
      ips: Set<string>;
      org?: string;
      asn?: string;
      country?: string;
      confidence: number;
      confidenceLabel: string;
      unresolvedReason?: string;
      bytesOut: number;
      bytesIn: number;
      riskScore: number;
      riskLevel: typeof flows[number]['risk_level'];
      reasons: Set<string>;
      flows: number;
    }>>((acc, flow) => {
      const identity = getDestinationIdentity(flow);
      const current = acc[identity] ?? {
        identity,
        domains: new Set<string>(),
        ips: new Set<string>(),
        org: flow.organization,
        asn: flow.asn,
        country: flow.country,
        confidence: flow.confidence_score ?? 0,
        confidenceLabel: getConfidenceLabel(flow),
        unresolvedReason: flow.unresolved_reason,
        bytesOut: 0,
        bytesIn: 0,
        riskScore: 0,
        riskLevel: 'low',
        reasons: new Set<string>(),
        flows: 0
      };
      if (flow.domain) current.domains.add(flow.domain);
      current.ips.add(flow.dst_ip);
      current.bytesOut += flow.bytes_out;
      current.bytesIn += flow.bytes_in;
      current.flows += 1;
      (flow.why_flagged || [flow.detection_reason || 'No active risk indicator']).forEach(reason => current.reasons.add(reason));
      if (flow.risk_score > current.riskScore) {
        current.riskScore = flow.risk_score;
        current.riskLevel = flow.risk_level;
      }
      acc[identity] = current;
      return acc;
    }, {});

    return Object.values(grouped)
      .filter(destination => {
        const term = searchTerm.toLowerCase();
        return !term || [
          destination.identity,
          destination.org,
          destination.asn,
          destination.country,
          ...destination.domains,
          ...destination.ips
        ].filter(Boolean).some(value => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => b.riskScore - a.riskScore || b.bytesOut - a.bytesOut);
  }, [flows, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-gray-800 bg-[#111]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <Globe2 size={20} className="text-blue-400" />
              Destination Intelligence
            </h1>
            <p className="text-sm text-gray-500 mt-1">Resolved service, domain, ASN, confidence, and investigation value.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search service, org, ASN, IP..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9 pr-4 py-2 bg-black/50 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 w-72"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {destinations.map(destination => (
            <div key={destination.identity} className="bg-[#111] border border-gray-800 rounded-xl p-5">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-gray-100 font-semibold truncate">{destination.identity}</h2>
                  <p className="text-xs text-gray-500 mt-1 truncate">{destination.org || 'Organization context pending'} • {destination.asn || 'ASN pending'}</p>
                </div>
                <span className={`px-2 py-1 rounded border text-xs uppercase h-fit ${getRiskColorClass(destination.riskLevel)}`}>
                  {destination.riskLevel} {destination.riskScore}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-black/30 border border-gray-800 rounded p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Bytes Out</div>
                  <div className="text-sm text-orange-300 mt-1 font-mono">{formatBytes(destination.bytesOut)}</div>
                </div>
                <div className="bg-black/30 border border-gray-800 rounded p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Confidence</div>
                  <div className="text-sm text-gray-200 mt-1">{destination.confidenceLabel} ({destination.confidence}%)</div>
                </div>
                <div className="bg-black/30 border border-gray-800 rounded p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Drilldown</div>
                  <div className="text-sm text-gray-200 mt-1">{destination.flows} flows • {destination.ips.size} IPs</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/20 border border-gray-800/60 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-400 uppercase tracking-wider text-[10px] mb-2">
                    <Layers3 size={12} /> Identity Stack
                  </div>
                  <div className="space-y-1 text-gray-300">
                    <div>Domains: {[...destination.domains].join(', ') || 'No DNS/SNI observed'}</div>
                    <div>IPs: {[...destination.ips].slice(0, 4).join(', ')}</div>
                    <div>Country/region: {destination.country || 'Not geolocated'}</div>
                  </div>
                </div>
                <div className="bg-black/20 border border-gray-800/60 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-400 uppercase tracking-wider text-[10px] mb-2">
                    <HelpCircle size={12} /> Analyst Notes
                  </div>
                  <div className="space-y-1 text-gray-300">
                    <div>{[...destination.reasons][0]}</div>
                    {destination.unresolvedReason && <div className="text-yellow-300">{destination.unresolvedReason}</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
