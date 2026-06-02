import React, { useMemo } from 'react';
import { useDlpStore } from '../../store/useDlpStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { format } from 'date-fns';
import { ShieldAlert, Shield } from 'lucide-react';

export default function AlertPanel() {
  const alerts = useDlpStore(state => state.alerts);
  const clearAlerts = useDlpStore(state => state.clearAlerts);
  const setInvestigatingAlert = useDlpStore(state => state.setInvestigatingAlert);
  const rules = useSettingsStore(state => state.rules);

  // Filter alerts based on active rules
  const filteredAlerts = useMemo(() => {
    const enabledRuleNames = new Set(rules.filter(r => r.enabled).map(r => r.name));
    return alerts.filter(a => enabledRuleNames.has(a.matches?.[0]?.pattern_name || a.detection_reason || ''));
  }, [alerts, rules]);

  // Group alerts by destination IP for Threat Correlation
  const correlatedGroups = useMemo(() => {
    const groups: Record<string, typeof filteredAlerts> = {};
    filteredAlerts.forEach(a => {
      if (!groups[a.dst_ip]) groups[a.dst_ip] = [];
      groups[a.dst_ip].push(a);
    });
    return groups;
  }, [filteredAlerts]);

  return (
    <div className="w-80 bg-[var(--bg-surface-2)] border-l border-white/5 flex flex-col h-full shrink-0 relative z-10">
      <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[var(--bg-surface-1)]">
        <h2 className="font-bold text-xs tracking-widest text-gray-400">THREAT INTELLIGENCE</h2>
        <button 
          onClick={clearAlerts}
          className="text-xs text-gray-500 hover:text-white transition-colors uppercase"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="relative w-24 h-24 mb-4">
              <Shield className="absolute inset-0 m-auto text-[var(--color-success)]" size={32} />
            </div>
            <p className="text-sm font-mono tracking-widest text-[var(--color-success)]">SYSTEM SECURE</p>
          </div>
        ) : (
          Object.entries(correlatedGroups).map(([ip, groupAlerts]) => {
            const primaryAlert = groupAlerts[0];
            const severity = primaryAlert.matches?.[0]?.severity || Math.ceil(primaryAlert.risk_score / 10) || 10;
            
            let borderClass = 'border-l-[3px] border-[var(--color-success)]';
            if (severity >= 8) borderClass = 'border-l-[3px] border-[var(--color-error)]';
            else if (severity >= 5) borderClass = 'border-l-[3px] border-[var(--color-warning)]';

            return (
              <div key={ip} className={`bg-[var(--bg-surface-1)] border border-white/10 rounded overflow-hidden animate-in slide-in-from-right-4 duration-300 ${borderClass}`}>
                {/* Header */}
                <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className={severity >= 8 ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'} />
                    <span className="font-bold text-[11px] text-gray-200 uppercase tracking-wider">{primaryAlert.matches?.[0]?.pattern_name || primaryAlert.detection_reason || 'Risk Alert'}</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-gray-400">
                    SEV {severity}/10
                  </div>
                </div>
                
                {/* Sub-header */}
                <div className="p-3 pb-2 flex justify-between text-[11px] font-mono text-gray-400">
                  <span>{ip}:{primaryAlert.dst_port}</span>
                  <span>{primaryAlert.protocol}</span>
                  {groupAlerts.length > 1 && <span className="text-[var(--color-primary)]">{groupAlerts.length} correlated</span>}
                </div>

                {/* Body */}
                <div className="px-3 pb-3 space-y-2">
                  <div className="p-2 bg-black/40 rounded font-mono text-[10px] text-gray-300 break-all border border-white/5">
                    "{primaryAlert.matches?.[0]?.snippet || primaryAlert.why_flagged?.[0] || 'No payload snippet available; review flow metadata.'}"
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[10px] text-gray-600 mt-2">
                    <span>{format(new Date(primaryAlert.timestamp_ms ?? Date.parse(primaryAlert.timestamp_start)), 'HH:mm:ss')}</span>
                    <button 
                      onClick={() => setInvestigatingAlert(primaryAlert)}
                      className="text-[var(--color-primary)] hover:text-white transition-colors font-bold uppercase tracking-wider"
                    >
                      Investigate &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
