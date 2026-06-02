import React from 'react';
import { ShieldAlert, LayoutDashboard, Settings, Map, History } from 'lucide-react';
import { useDlpStore } from '../../store/useDlpStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function Header() {
  const stats = useDlpStore(state => state.stats);
  const alerts = useDlpStore(state => state.alerts);
  const wsStatus = useDlpStore(state => state.wsStatus);
  const { activeView, setActiveView } = useSettingsStore();

  const isCritical = alerts.length > 0;

  return (
    <div className="relative z-20">
      <header className="flex h-14 bg-[var(--bg-surface-1)] border-b border-[rgba(255,255,255,0.05)] items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <ShieldAlert size={24} className={isCritical ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'} />
          <span className="font-sans font-bold tracking-widest text-sm text-gray-200">
            HARMLESS EXFILTRATION MONITOR
          </span>
          
          <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-white/5 rounded border border-white/10">
            <div className={`w-2 h-2 rounded-full ${
              wsStatus === 'CONNECTED' ? 'bg-[var(--color-success)]' :
              wsStatus === 'RECONNECTING' ? 'bg-[var(--color-warning)] animate-pulse' :
              'bg-[var(--color-error)]'
            }`} />
            <span className="text-[10px] font-mono tracking-widest text-gray-400">
              {wsStatus === 'CONNECTED' ? 'CONNECTED' : wsStatus === 'RECONNECTING' ? 'RECONNECTING...' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button 
              title="Dashboard"
              className={`p-2 rounded transition-colors ${activeView === 'SANKEY' ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onClick={() => setActiveView('SANKEY')}
            >
              <LayoutDashboard size={18} />
            </button>
            <button 
              title="Geo Map"
              className={`p-2 rounded transition-colors ${activeView === 'MAP' ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onClick={() => setActiveView('MAP')}
            >
              <Map size={18} />
            </button>
            <button 
              title="History"
              className={`p-2 rounded transition-colors ${activeView === 'HISTORY' ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onClick={() => setActiveView('HISTORY')}
            >
              <History size={18} />
            </button>
            <button 
              title="Settings"
              className={`p-2 rounded transition-colors ${activeView === 'SETTINGS' ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onClick={() => setActiveView('SETTINGS')}
            >
              <Settings size={18} />
            </button>
          </div>

          <div className="flex items-center gap-6 border-l border-white/10 pl-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 tracking-wider">PACKETS</span>
              <span className="font-mono text-sm tabular-nums text-gray-200">{stats?.packets_total.toLocaleString() || '0'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 tracking-wider">FLOWS</span>
              <span className="font-mono text-sm tabular-nums text-gray-200">{stats?.flows.length.toLocaleString() || '0'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 tracking-wider">THREATS</span>
              <span className="font-mono text-sm tabular-nums text-[var(--color-error)]">{alerts.length.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Subtle Status Strip */}
      <div 
        className={`h-0.5 w-full transition-colors duration-1000 ${
          isCritical 
            ? 'bg-[var(--color-error)] opacity-100 animate-pulse' 
            : 'bg-[var(--color-success)] opacity-40'
        }`}
      />
    </div>
  );
}
