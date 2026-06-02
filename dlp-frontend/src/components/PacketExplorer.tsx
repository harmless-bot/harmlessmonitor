import { useState } from 'react';
import { useDlpStore } from '../store/useDlpStore';
import { Search, Database, ArrowRight, BrainCircuit, ShieldAlert, Crosshair } from 'lucide-react';
import { getConfidenceLabel, getDestinationIdentity, makeIocBundle } from '../utils/flowAnalysis';
import { useNavigate } from 'react-router-dom';

export default function PacketExplorer() {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const flows = useDlpStore(state => state.flows);
  const setInvestigatingFlow = useDlpStore(state => state.setInvestigatingFlow);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFlows = flows.filter(f => 
    f.src_ip.includes(searchTerm) || 
    f.dst_ip.includes(searchTerm) ||
    f.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getDestinationIdentity(f).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 py-5 border-b border-gray-800 bg-[#111]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Packet Explorer</h1>
            <p className="text-sm text-gray-500 mt-1">Raw telemetry and enriched flow analysis</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search IP, Domain, Protocol..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-black/50 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="border border-gray-800 rounded-lg bg-[#111] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Identity (Enriched)</th>
                <th className="px-4 py-3 font-medium">Network (Src ➞ Dst)</th>
                <th className="px-4 py-3 font-medium">Metrics</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredFlows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Database size={32} className="text-gray-700 mb-3" />
                      <p>No packets found in current buffer.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFlows.map(flow => (
                  <tr key={flow.flow_id} className="hover:bg-white/[0.02] transition-colors text-sm">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {new Date(flow.timestamp_start).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-200 font-medium">
                          {getDestinationIdentity(flow)}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                            {flow.organization || flow.unresolved_reason || 'Provider context pending'} • {flow.country || 'not geolocated'}
                          </span>
                          <div 
                            className={`w-2 h-2 rounded-full ${(flow.confidence_score ?? 0) > 80 ? 'bg-green-500' : (flow.confidence_score ?? 0) > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            title={`Resolution Confidence: ${flow.confidence_score ?? 0}% (${getConfidenceLabel(flow)})`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col font-mono text-xs">
                        <span className="text-gray-400">{flow.src_ip}</span>
                        <div className="flex items-center gap-1 text-gray-600 my-0.5">
                          <ArrowRight size={10} />
                          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[9px] uppercase">{flow.protocol}</span>
                        </div>
                        <span className="text-blue-400">{flow.dst_ip}:{flow.dst_port}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col font-mono text-xs text-gray-400">
                        <span>Pkt: {flow.packet_count}</span>
                        <span className="text-orange-400">Out: {(flow.bytes_out / 1024).toFixed(1)}KB</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setInvestigatingFlow(flow); navigate('/ai'); }} className="p-1.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-blue-400 rounded transition-colors" title="Analyze with AI">
                          <BrainCircuit size={14} />
                        </button>
                        <button onClick={() => handleCopy(`ev-${flow.flow_id}`, JSON.stringify(flow, null, 2))} className="p-1.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded transition-colors" title="Export evidence JSON">
                          <Crosshair size={14} className={copiedId === `ev-${flow.flow_id}` ? "text-green-400" : ""} />
                        </button>
                        <button onClick={() => handleCopy(`ioc-${flow.flow_id}`, makeIocBundle(flow))} className="p-1.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-green-400 rounded transition-colors" title="Copy IOC bundle">
                          <ShieldAlert size={14} className={copiedId === `ioc-${flow.flow_id}` ? "text-green-400" : ""} />
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
