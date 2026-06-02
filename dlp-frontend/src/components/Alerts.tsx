import { useDlpStore } from '../store/useDlpStore';
import { ShieldAlert, AlertTriangle, Info, Clock, ArrowRight, BrainCircuit, Clipboard, FileJson, Check } from 'lucide-react';
import { formatBytes, getConfidenceLabel, getDestinationIdentity, makeIocBundle } from '../utils/flowAnalysis';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Alerts() {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const flows = useDlpStore(state => state.flows);
  const setInvestigatingFlow = useDlpStore(state => state.setInvestigatingFlow);
  
  // Filter for medium, high, critical risk flows
  const alerts = flows
    .filter(f => f.risk_level === 'critical' || f.risk_level === 'high' || f.risk_level === 'medium')
    .sort((a, b) => b.risk_score - a.risk_score);

  const getRiskIcon = (level: string) => {
    switch(level) {
      case 'critical': return <ShieldAlert className="text-red-500" size={20} />;
      case 'high': return <AlertTriangle className="text-orange-500" size={20} />;
      case 'medium': return <Info className="text-yellow-500" size={20} />;
      default: return <Info className="text-gray-500" size={20} />;
    }
  };

  const getRiskBg = (level: string) => {
    switch(level) {
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      case 'high': return 'bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-6 space-y-6 overflow-y-auto">
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          Alerts Requiring Review
        </h1>
        <p className="text-sm text-gray-500 mt-1">High-risk behaviors detected by the Risk Engine.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-lg">
          <ShieldAlert size={48} className="text-gray-700 mb-4" />
          <p>No active alerts requiring review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.flow_id} className={`p-5 rounded-lg border ${getRiskBg(alert.risk_level)}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  {getRiskIcon(alert.risk_level)}
                  <h3 className="font-semibold text-gray-200">
                    {alert.risk_level.toUpperCase()} RISK: {alert.why_flagged?.[0] || alert.detection_reason || 'Suspicious Activity'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <Clock size={12} />
                  {new Date(alert.timestamp_start).toLocaleTimeString()}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-black/40 p-4 rounded border border-gray-800/50">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Network Context</div>
                  <div className="font-mono text-sm text-gray-300 flex items-center gap-2">
                    {alert.src_ip} 
                    <ArrowRight size={14} className="text-gray-600" />
                    <span className="text-blue-400">{getDestinationIdentity(alert)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Destination: {alert.dst_ip}:{alert.dst_port} • {alert.protocol} • {formatBytes(alert.bytes_out)} out
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Confidence: {getConfidenceLabel(alert)}{alert.confidence_score ? ` (${alert.confidence_score}%)` : ''} via {alert.resolution_source || 'telemetry'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risk Indicators</div>
                  <div className="flex flex-wrap gap-2">
                    {(alert.strongest_indicators || alert.flags).map((ind, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 font-mono">
                        {ind}
                      </span>
                    ))}
                  </div>
                  {alert.recommended_steps && (
                    <div className="text-xs text-gray-400 mt-2 border-t border-gray-800 pt-2">
                      <span className="text-gray-500">Suggested Action: </span> 
                      {alert.recommended_steps}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div className="bg-black/30 border border-gray-800/50 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">False-positive check</div>
                  <p className="text-xs text-gray-300 mt-1">{alert.false_positive_possibilities?.join('; ') || 'Legitimate business transfer is still possible.'}</p>
                </div>
                <div className="bg-black/30 border border-gray-800/50 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Unresolved reason</div>
                  <p className="text-xs text-gray-300 mt-1">{alert.unresolved_reason || 'Destination identity has enough context for review.'}</p>
                </div>
                <div className="bg-black/30 border border-gray-800/50 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Process</div>
                  <p className="text-xs text-gray-300 mt-1">{alert.process_name || 'Unknown process'} • {alert.first_seen ? 'first-seen destination' : 'seen before'}</p>
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { setInvestigatingFlow(alert); navigate('/ai'); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors flex items-center gap-2"
                >
                  <BrainCircuit size={14} /> Analyze with AI
                </button>
                <button
                  onClick={() => handleCopy(`ioc-${alert.flow_id}`, makeIocBundle(alert))}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded font-medium transition-colors flex items-center gap-2"
                >
                  {copiedId === `ioc-${alert.flow_id}` ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />} 
                  {copiedId === `ioc-${alert.flow_id}` ? 'Copied' : 'Copy IOC Bundle'}
                </button>
                <button
                  onClick={() => handleCopy(`ev-${alert.flow_id}`, JSON.stringify(alert, null, 2))}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded font-medium transition-colors flex items-center gap-2"
                >
                  {copiedId === `ev-${alert.flow_id}` ? <Check size={14} className="text-green-400" /> : <FileJson size={14} />} 
                  {copiedId === `ev-${alert.flow_id}` ? 'Copied' : 'Export Evidence'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
