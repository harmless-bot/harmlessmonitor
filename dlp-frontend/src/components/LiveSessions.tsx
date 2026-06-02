import { useState } from 'react';
import { 
  Activity,
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  ArrowRight,
  Globe,
  Database,
  Search,
  Filter,
  Clipboard,
  BrainCircuit,
  Eye
} from 'lucide-react';
import { useDlpStore } from '../store/useDlpStore';
import { formatBytes, getConfidenceLabel, getDestinationIdentity, getRiskColorClass, makeIocBundle } from '../utils/flowAnalysis';
import { useNavigate } from 'react-router-dom';

export default function LiveSessions() {
  const navigate = useNavigate();
  const flows = useDlpStore(state => state.flows);
  const setInvestigatingFlow = useDlpStore(state => state.setInvestigatingFlow);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'suspicious' | 'first-seen' | 'upload-heavy' | 'unresolved' | 'high-risk' | 'cloud-vpn' | 'new-external'>('all');

  const filteredFlows = flows.filter(f => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      getDestinationIdentity(f).toLowerCase().includes(term) ||
      f.src_ip.includes(searchTerm) ||
      f.dst_ip.includes(searchTerm) ||
      (f.organization || '').toLowerCase().includes(term) ||
      (f.enriched_provider || '').toLowerCase().includes(term) ||
      (f.process_name || '').toLowerCase().includes(term);
    
    let matchesFilter = false;
    switch (filter) {
      case 'all': matchesFilter = true; break;
      case 'suspicious': matchesFilter = ['medium', 'high', 'critical'].includes(f.risk_level); break;
      case 'first-seen': matchesFilter = Boolean(f.first_seen); break;
      case 'upload-heavy': matchesFilter = f.bytes_out > f.bytes_in * 5; break;
      case 'unresolved': matchesFilter = Boolean(f.unresolved_reason); break;
      case 'high-risk': matchesFilter = (f.threat_score || 0) >= 60; break;
      case 'cloud-vpn': matchesFilter = ['vpn', 'proxy', 'tor', 'hosting', 'cloud'].some(t => (f.enriched_usage_type || '').toLowerCase().includes(t)); break;
      case 'new-external': matchesFilter = Boolean(f.first_seen && !f.src_ip.startsWith('192.168.') && !f.src_ip.startsWith('10.')); break;
    }
    return matchesSearch && matchesFilter;
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 bg-[#111]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              Live Network Sessions
              <span className="flex h-2 w-2 relative ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Real-time exfiltration monitoring and flow analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Filter sessions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-black/50 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-gray-800 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
              <Filter size={16} />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as typeof filter)}
                className="bg-transparent outline-none text-gray-300"
              >
                <option className="bg-[#111]" value="all">All</option>
                <option className="bg-[#111]" value="suspicious">Suspicious only</option>
                <option className="bg-[#111]" value="high-risk">High-risk IPs only</option>
                <option className="bg-[#111]" value="cloud-vpn">Cloud/VPN/Proxy only</option>
                <option className="bg-[#111]" value="new-external">New external IPs</option>
                <option className="bg-[#111]" value="first-seen">First-seen only</option>
                <option className="bg-[#111]" value="upload-heavy">Upload-heavy</option>
                <option className="bg-[#111]" value="unresolved">Unresolved only</option>
              </select>
            </button>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border border-gray-800 rounded-lg bg-[#111] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Resolved Service</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Data (Out/In)</th>
                <th className="px-4 py-3 font-medium">Identity Stack</th>
                <th className="px-4 py-3 font-medium">Why Flagged</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredFlows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Activity size={32} className="text-gray-700 mb-3" />
                      <p>No active sessions detected.</p>
                      <p className="text-xs mt-1">Waiting for capture engine...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFlows.map((flow) => (
                  <tr key={flow.flow_id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium uppercase tracking-wider ${getRiskColor(flow.risk_level)}`}>
                        {flow.risk_level === 'critical' ? <ShieldAlert size={12} /> : 
                         flow.risk_level === 'high' ? <Shield size={12} /> :
                         <ShieldCheck size={12} />}
                        {flow.risk_score}
                        {(flow.threat_score || 0) > 0 && <span className="text-[9px] text-gray-500 ml-1">({flow.threat_score} ext)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start flex-col">
                        <span className="text-sm font-medium text-gray-200">
                          {getDestinationIdentity(flow)}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Database size={10} />
                            {flow.service_label || flow.domain || 'Identity pending'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRiskColorClass(flow.risk_level)}`}>
                            {getConfidenceLabel(flow)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                        <span className="truncate w-24">{flow.src_ip}</span>
                        <ArrowRight size={14} className="text-gray-600" />
                        <span className="text-blue-400 truncate w-24">{flow.dst_ip}</span>
                        <span className="text-gray-600">:{flow.dst_port}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{flow.protocol}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-orange-400 flex items-center gap-1">
                          <ArrowRight size={12} className="-rotate-45" /> 
                          {formatBytes(flow.bytes_out)}
                        </div>
                        <div className="text-xs text-green-400/80 flex items-center gap-1">
                          <ArrowRight size={12} className="rotate-135" /> 
                          {formatBytes(flow.bytes_in)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-300 flex items-center gap-1.5">
                          <Globe size={12} className="text-gray-500" />
                          {flow.country || 'Not geolocated'}
                          {flow.enriched_provider && <span className="text-gray-400 font-medium ml-1 truncate max-w-[150px]">{flow.enriched_provider}</span>}
                          {flow.enriched_usage_type && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 ml-1">{flow.enriched_usage_type}</span>}
                          {flow.enriched_asn && <span className="text-[10px] text-gray-600 ml-1">[{flow.enriched_asn}]</span>}
                        </span>
                        {!flow.enriched_provider && (
                          <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                            {flow.organization || flow.unresolved_reason || 'Provider enrichment pending'}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600 mt-0.5">
                          {flow.resolution_source || 'No ASN source'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-300 max-w-[260px]">
                        {flow.detection_reason || flow.why_flagged?.[0] || 'No risky behavior detected'}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Process: {flow.process_name || 'unknown'} • {flow.first_seen ? 'first seen' : 'seen before'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setInvestigatingFlow(flow); navigate('/ai'); }}
                          className="p-2 text-gray-500 hover:text-blue-300 hover:bg-white/10 rounded transition-colors"
                          title="Analyze with AI"
                        >
                          <BrainCircuit size={16} />
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(makeIocBundle(flow))}
                          className="p-2 text-gray-500 hover:text-emerald-300 hover:bg-white/10 rounded transition-colors"
                          title="Copy IOC bundle"
                        >
                          <Clipboard size={16} />
                        </button>
                        <button
                          onClick={() => { setInvestigatingFlow(flow); navigate('/packets'); }}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                          title="Inspect packets"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
