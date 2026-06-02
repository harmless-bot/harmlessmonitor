import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDlpStore } from '../../store/useDlpStore';
import { Settings } from 'lucide-react';
export default function SettingsTab() {
  const { 
    rules, 
    toggleRule, 
    maxFlows, 
    setMaxFlows, 
    alertSound, 
    setAlertSound, 
    graphRefreshRate, 
    setGraphRefreshRate,
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey 
  } = useSettingsStore();
  const wsStatus = useDlpStore(state => state.wsStatus);

  return (
    <div className="flex-1 flex flex-col p-6 max-w-3xl animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest text-gray-200">DASHBOARD SETTINGS</h1>
        <p className="text-sm text-gray-500 mt-1">Configure threat detection rules and display preferences.</p>
      </div>

      <div className="space-y-8">
        {/* Detection Settings */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-4 border-b border-white/10 pb-2">DETECTION SETTINGS</h2>
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between bg-black/20 p-3 rounded border border-white/5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rule.enabled} 
                    onChange={() => toggleRule(rule.id)}
                    className="w-4 h-4 rounded border-gray-600 text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-black"
                  />
                  <span className="text-sm text-gray-200">{rule.name}</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Severity:</span>
                  <select 
                    value={rule.severity} 
                    disabled
                    className="bg-black border border-white/10 rounded px-2 py-1 text-sm text-gray-300 appearance-none"
                  >
                    <option value={rule.severity}>[{rule.severity}] ▾</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">Note: These toggles act as a client-side filter. The backend still processes all traffic.</p>
        </section>

        {/* Display Settings */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-4 border-b border-white/10 pb-2">DISPLAY SETTINGS</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Max flows in graph:</span>
              <div className="flex items-center gap-3">
                <select 
                  value={maxFlows}
                  onChange={(e) => setMaxFlows(Number(e.target.value))}
                  className="bg-black border border-white/10 rounded px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-[var(--color-primary)]"
                >
                  <option value={10}>[10] ▾</option>
                  <option value={20}>[20] ▾</option>
                  <option value={30}>[30] ▾</option>
                  <option value={50}>[50] ▾</option>
                </select>
                <span className="text-xs text-gray-500">(options: 10, 20, 30, 50)</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Alert sound:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={alertSound}
                  onChange={(e) => setAlertSound(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-black"
                />
                <span className="text-sm text-gray-400">Enable</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Graph refresh rate:</span>
              <div className="flex items-center gap-3">
                <select 
                  value={graphRefreshRate}
                  onChange={(e) => setGraphRefreshRate(Number(e.target.value))}
                  className="bg-black border border-white/10 rounded px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-[var(--color-primary)]"
                >
                  <option value={500}>[500ms] ▾</option>
                  <option value={1000}>[1s] ▾</option>
                  <option value={2000}>[2s] ▾</option>
                </select>
                <span className="text-xs text-gray-500">(options: 500ms, 1s, 2s)</span>
              </div>
            </div>
          </div>
        </section>

        {/* WebSocket */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-4 border-b border-white/10 pb-2">WEBSOCKET</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">WS Endpoint:</span>
              <div className="flex gap-2 w-1/2">
                <input 
                  type="text" 
                  value="ws://localhost:9001" 
                  readOnly 
                  className="flex-1 bg-black border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-gray-300"
                />
                <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm transition-colors">
                  [Reconnect]
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">Status:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  wsStatus === 'CONNECTED' ? 'bg-[var(--color-success)]' :
                  wsStatus === 'RECONNECTING' ? 'bg-[var(--color-warning)] animate-pulse' :
                  'bg-[var(--color-error)]'
                }`} />
                <span className="text-sm font-mono text-gray-400">
                  {wsStatus === 'CONNECTED' ? 'Connected' : 
                   wsStatus === 'RECONNECTING' ? 'Reconnecting...' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Analysis Settings */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4 text-gray-200">
            <Settings className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="font-bold text-sm">AI Analysis Settings</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">AI Provider</label>
              <select 
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openai' | 'claude')}
                className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm text-gray-200 focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="claude">Anthropic Claude</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 block mb-1">API Key</label>
              <input 
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="Enter API Key (stored locally)"
                className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm text-gray-200 focus:outline-none focus:border-[var(--color-primary)] placeholder-gray-600"
              />
              <p className="text-[10px] text-gray-500 mt-1">Keys are only stored in your browser's local memory.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
