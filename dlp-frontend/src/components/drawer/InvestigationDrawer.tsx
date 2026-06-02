import React, { useEffect, useState } from 'react';
import { useDlpStore } from '../../store/useDlpStore';
import { resolveOrg } from '../../utils/ipOrg';
import { X, Copy, ShieldBan, BrainCircuit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useSettingsStore } from '../../store/useSettingsStore';
import { analyzeThreatWithAI } from '../../services/aiAnalyzer';

export default function InvestigationDrawer() {
  const alert = useDlpStore(state => state.investigatingAlert);
  const setInvestigatingAlert = useDlpStore(state => state.setInvestigatingAlert);
  const { aiProvider, aiApiKey } = useSettingsStore();
  const [toast, setToast] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiError, setAiError] = useState('');

  // Reset state when alert changes
  useEffect(() => {
    setAiAnalysis('');
    setAiError('');
  }, [alert]);


  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInvestigatingAlert(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setInvestigatingAlert]);

  const close = () => setInvestigatingAlert(null);

  const copyReport = () => {
    if (!alert) return;
    const report = `
INCIDENT INVESTIGATION
Label: ${alert.matches?.[0]?.pattern_name || alert.detection_reason || 'Exfiltration Risk'}
Severity: SEV ${alert.matches?.[0]?.severity || Math.ceil(alert.risk_score / 10)}/10
Timestamp: ${format(new Date(alert.timestamp_ms ?? Date.parse(alert.timestamp_start)), 'HH:mm:ss')}
Source: ${alert.src_ip}:${alert.src_port || 'unknown'}
Dest: ${alert.dst_ip}:${alert.dst_port}
Protocol: ${alert.protocol}
Org: ${resolveOrg(alert.dst_ip)}

PAYLOAD PREVIEW
"${alert.matches?.[0]?.snippet || alert.why_flagged?.[0] || 'No payload snippet available.'}"
`.trim();
    navigator.clipboard.writeText(report);
    setToast('Report copied to clipboard');
    setTimeout(() => setToast(''), 3000);
  };

  const blockIp = () => {
    if (!alert) return;
    const cmd = `sudo pfctl -t blocklist -T add ${alert.dst_ip}`;
    navigator.clipboard.writeText(cmd);
    setToast('Command copied — run in your terminal to block this IP');
    setTimeout(() => setToast(''), 3000);
  };

  const handleAiAnalysis = async () => {
    if (!alert) return;
    if (!aiApiKey) {
      setAiError('API Key not configured. Please add it in the Settings Tab.');
      return;
    }
    
    setIsAnalyzing(true);
    setAiError('');
    try {
      const result = await analyzeThreatWithAI(alert, aiProvider, aiApiKey);
      setAiAnalysis(result);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!alert) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300" 
        onClick={close} 
      />
      <div 
        className="fixed top-0 right-0 h-full w-[450px] bg-[var(--bg-surface-1)] border-l border-white/10 z-50 shadow-2xl flex flex-col"
        style={{
          transform: alert ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[var(--bg-surface-2)]">
          <h2 className="font-bold text-sm tracking-widest text-gray-200">INCIDENT INVESTIGATION</h2>
          <button onClick={close} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Label</div>
            <div className="font-bold text-lg text-[var(--color-error)]">{alert.matches?.[0]?.pattern_name || alert.detection_reason || 'Exfiltration Risk'}</div>
            <div className="text-sm font-mono text-gray-400">SEV {alert.matches?.[0]?.severity || Math.ceil(alert.risk_score / 10)}/10 • {format(new Date(alert.timestamp_ms ?? Date.parse(alert.timestamp_start)), 'HH:mm:ss')}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/5 pb-1">NETWORK DETAILS</div>
            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm font-mono text-gray-300">
              <span className="text-gray-500">Source:</span>
              <span>{alert.src_ip}:{alert.src_port || 'unknown'}</span>
              <span className="text-gray-500">Dest:</span>
              <span>{alert.dst_ip}:{alert.dst_port}</span>
              <span className="text-gray-500">Protocol:</span>
              <span>{alert.protocol}</span>
              <span className="text-gray-500">Org:</span>
              <span className="text-[var(--color-primary)]">{resolveOrg(alert.dst_ip)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/5 pb-1 flex justify-between items-center">
              <span>PAYLOAD PREVIEW</span>
              <button 
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 text-[10px] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-0.5 rounded border border-[var(--color-primary)]/20 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={12} />}
                {isAnalyzing ? 'ANALYZING...' : `ANALYZE WITH ${aiProvider.toUpperCase()}`}
              </button>
            </div>
            <div className="p-3 bg-black/50 rounded font-mono text-xs text-red-200 border border-red-500/20 break-all">
              "{alert.matches?.[0]?.snippet || alert.why_flagged?.[0] || 'No payload snippet available; review enriched metadata.'}"
            </div>
          </div>

          {aiError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {aiError}
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--color-primary)] uppercase tracking-wider border-b border-[var(--color-primary)]/20 pb-1 flex items-center gap-2">
                <BrainCircuit size={14} /> AI THREAT ANALYSIS
              </div>
              <div className="p-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 rounded text-xs text-gray-300 space-y-2 max-h-[300px] overflow-y-auto">
                {aiAnalysis.split('\\n').map((line, i) => (
                  <p key={i} className={line.startsWith('#') || line.startsWith('**') ? 'font-bold text-gray-200 mt-2' : ''}>
                    {line.replace(/\\*\\*/g, '')}
                  </p>
                ))}
              </div>
            </div>
          )}


          <div className="space-y-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/5 pb-1">RECOMMENDED ACTIONS</div>
            <ul className="list-disc pl-5 space-y-3 text-sm text-gray-300">
              <li>
                Block outbound traffic to <span className="font-mono text-white">{alert.dst_ip}</span> via firewall rule
              </li>
              <li>
                Run: <code className="px-1.5 py-0.5 bg-black/50 rounded text-[var(--color-warning)]">sudo pfctl -t blocklist -T add {alert.dst_ip}</code>
              </li>
              <li>
                Investigate process on <span className="font-mono text-white">{alert.src_ip}</span>{alert.src_port ? ` using port ${alert.src_port}` : ''}<br/>
                Run: <code className="px-1.5 py-0.5 bg-black/50 rounded text-[var(--color-primary)]">{alert.src_port ? `lsof -i :${alert.src_port}` : 'ps aux | grep suspicious-process'}</code>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[var(--bg-surface-2)] flex gap-3">
          <button 
            onClick={copyReport}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors text-sm text-gray-200"
          >
            <Copy size={16} /> Copy Report
          </button>
          <button 
            onClick={blockIp}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded transition-colors text-sm text-red-400"
          >
            <ShieldBan size={16} /> Block IP
          </button>
        </div>

        {toast && (
          <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2 bg-[var(--color-primary)] text-black px-4 py-2 rounded shadow-lg text-sm font-bold whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
