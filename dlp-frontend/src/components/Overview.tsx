import { 
  Activity, 
  ShieldAlert, 
  Globe2, 
  ArrowUpRight,
  ArrowDownRight,
  Network,
  Database,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useDlpStore } from '../store/useDlpStore';
import SankeyChart from './charts/SankeyChart';
import WorldMap from './charts/WorldMap';
import { formatBytes, getConfidenceLabel, getDestinationIdentity, getRiskColorClass } from '../utils/flowAnalysis';

export default function Overview() {
  const flows = useDlpStore(state => state.flows);
  const usingDemoData = useDlpStore(state => state.usingDemoData);
  
  const totalFlows = flows.length;
  const criticalFlows = flows.filter(f => f.risk_level === 'critical').length;
  const highFlows = flows.filter(f => f.risk_level === 'high').length;
  const unresolvedFlows = flows.filter(f => f.geo_confidence === 'unresolved' || f.unresolved_reason).length;
  const highConfidence = flows.filter(f => (f.confidence_score ?? 0) >= 75).length;
  
  const totalBytesOut = flows.reduce((acc, f) => acc + f.bytes_out, 0);
  const totalBytesIn = flows.reduce((acc, f) => acc + f.bytes_in, 0);

  const topDestinations = Object.values(flows.reduce<Record<string, {
    identity: string;
    bytesOut: number;
    flowCount: number;
    highestRisk: number;
    riskLevel: typeof flows[number]['risk_level'];
    organization?: string;
    confidence?: number;
    confidenceLabel: string;
  }>>((acc, flow) => {
    const identity = getDestinationIdentity(flow);
    const current = acc[identity] ?? {
      identity,
      bytesOut: 0,
      flowCount: 0,
      highestRisk: 0,
      riskLevel: 'low',
      organization: flow.organization,
      confidence: flow.confidence_score,
      confidenceLabel: getConfidenceLabel(flow)
    };
    current.bytesOut += flow.bytes_out;
    current.flowCount += 1;
    if (flow.risk_score > current.highestRisk) {
      current.highestRisk = flow.risk_score;
      current.riskLevel = flow.risk_level;
    }
    acc[identity] = current;
    return acc;
  }, {})).sort((a, b) => b.bytesOut - a.bytesOut).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-6 space-y-6 overflow-y-auto">
      {usingDemoData && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 flex items-center justify-between">
          <span>
            Simulated investigation mode is active: data is realistic, enriched, and intentionally includes low/medium/high/critical cases.
          </span>
          <span className="text-xs font-mono text-cyan-300">Backend WebSocket: ws://localhost:8000/ws/live</span>
        </div>
      )}
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#111] border border-gray-800 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Active Sessions</span>
            <Activity className="text-blue-500 opacity-80" size={18} />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-light text-white">{totalFlows}</span>
            <span className="text-xs text-green-500 ml-2 flex items-center inline-flex">
              <ArrowUpRight size={12} /> 12%
            </span>
          </div>
          <div className="absolute -bottom-4 -right-4 text-blue-500/5">
            <Network size={100} />
          </div>
        </div>

        <div className="bg-[#111] border border-red-900/30 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest text-red-400/80">Critical Risks</span>
            <ShieldAlert className="text-red-500 opacity-80" size={18} />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-light text-red-500">{criticalFlows}</span>
            <span className="text-xs text-orange-400 ml-2">{highFlows} high</span>
          </div>
        </div>

        <div className="bg-[#111] border border-gray-800 rounded-lg p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Data Egress</span>
            <ArrowUpRight className="text-orange-500 opacity-80" size={18} />
          </div>
          <div className="mt-4 text-orange-400">
            <span className="text-3xl font-light">{formatBytes(totalBytesOut)}</span>
          </div>
        </div>

        <div className="bg-[#111] border border-gray-800 rounded-lg p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Data Ingress</span>
            <ArrowDownRight className="text-green-500 opacity-80" size={18} />
          </div>
          <div className="mt-4 text-green-400">
            <span className="text-3xl font-light">{formatBytes(totalBytesIn)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Resolution Confidence</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div className="mt-4 text-2xl text-gray-100">{highConfidence}/{totalFlows}</div>
          <p className="text-xs text-gray-500 mt-1">destinations have strong identity context</p>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Needs Enrichment</span>
            <HelpCircle size={18} className="text-yellow-400" />
          </div>
          <div className="mt-4 text-2xl text-yellow-300">{unresolvedFlows}</div>
          <p className="text-xs text-gray-500 mt-1">flows explain why identity is partial</p>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Investigation Priority</span>
            <Database size={18} className="text-blue-400" />
          </div>
          <div className="mt-4 text-2xl text-gray-100">{flows.filter(f => f.first_seen || f.bytes_out > 100_000_000).length}</div>
          <p className="text-xs text-gray-500 mt-1">first-seen or upload-heavy destinations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 h-[400px]">
        <div className="bg-[#111] border border-gray-800 rounded-lg flex flex-col overflow-hidden relative">
          <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center bg-black/20 z-10">
            <h2 className="text-sm font-semibold text-gray-200">Destination-Centric Flow View</h2>
            <div className="text-xs text-gray-500 font-mono">GROUPED BY SERVICE</div>
          </div>
          <div className="flex-1 p-4 relative">
            <SankeyChart />
          </div>
        </div>

        <div className="bg-[#111] border border-gray-800 rounded-lg flex flex-col overflow-hidden relative">
          <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center bg-black/20 z-10 absolute top-0 w-full backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Globe2 size={16} className="text-blue-500" />
              Destination Intelligence
            </h2>
          </div>
          <div className="flex-1 h-full w-full">
            <WorldMap />
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Connected Sites & Services</h2>
          <p className="text-xs text-gray-500 mt-1">Ranked by outbound volume, grouped by resolved identity instead of raw IP spam.</p>
        </div>
        <div className="grid grid-cols-5 divide-x divide-gray-800/70">
          {topDestinations.map(destination => (
            <div key={destination.identity} className="p-4">
              <div className="text-sm text-gray-100 truncate" title={destination.identity}>{destination.identity}</div>
              <div className="text-xs text-gray-500 truncate mt-1">{destination.organization || 'Provider context pending'}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-orange-300 font-mono text-sm">{formatBytes(destination.bytesOut)}</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] uppercase ${getRiskColorClass(destination.riskLevel)}`}>
                  {destination.riskLevel}
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full bg-blue-400" style={{ width: `${Math.max(8, destination.confidence ?? 20)}%` }} />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{destination.confidenceLabel} • {destination.flowCount} flow(s)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-lg flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Recent High-Risk Activity</h2>
        </div>
        <div className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 border-b border-gray-800 text-xs font-mono text-gray-500">
                <th className="px-5 py-3">TIMESTAMP</th>
                <th className="px-5 py-3">SOURCE</th>
                <th className="px-5 py-3">DESTINATION</th>
                <th className="px-5 py-3">SERVICE</th>
                <th className="px-5 py-3">RISK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {flows.filter(f => f.risk_level === 'critical' || f.risk_level === 'high').slice(0, 5).map(flow => (
                <tr key={flow.flow_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-400 font-mono">{new Date(flow.timestamp_start).toLocaleTimeString()}</td>
                  <td className="px-5 py-3 text-sm text-gray-300 font-mono">{flow.src_ip}</td>
                  <td className="px-5 py-3 text-sm">
                    <div className="text-blue-400">{getDestinationIdentity(flow)}</div>
                    <div className="text-xs text-gray-500">{flow.country} • {getConfidenceLabel(flow)}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-300">{flow.service_label || flow.organization || 'Identity pending'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs uppercase tracking-wider font-medium ${
                      flow.risk_level === 'critical' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                    }`}>
                      {flow.risk_level} ({flow.risk_score})
                    </span>
                  </td>
                </tr>
              ))}
              {flows.filter(f => f.risk_level === 'critical' || f.risk_level === 'high').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-sm">
                    No high-risk activity detected in current window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
