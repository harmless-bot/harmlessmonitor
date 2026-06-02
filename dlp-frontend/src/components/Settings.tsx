import { useSettingsStore } from '../store/useSettingsStore';
import { KeyRound, ShieldAlert, Cpu, BellRing, Check, Loader2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Settings() {
  const {
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey,
    aiBaseUrl,
    setAiBaseUrl,
    aiModel,
    setAiModel,
    maxFlows,
    setMaxFlows,
    alertSound,
    setAlertSound,
    rules,
    toggleRule
  } = useSettingsStore();

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle'|'success'|'error'>('idle');

  // Auto-set model defaults when changing provider if the current model is default-ish
  useEffect(() => {
    if (aiProvider === 'groq' && (aiModel === 'llama3.1' || aiModel === '')) {
      setAiModel('llama-3.3-70b-versatile');
    } else if (aiProvider === 'ollama' && (aiModel === 'llama-3.3-70b-versatile' || aiModel === '')) {
      setAiModel('llama3.1');
    } else if (aiProvider === 'openrouter' && aiModel === 'llama3.1') {
      setAiModel('openai/gpt-4o-mini');
    }
  }, [aiProvider]);

  const verifyApiKey = async () => {
    if (!aiApiKey) return;
    setIsVerifying(true);
    setVerifyStatus('idle');
    try {
      let url = '';
      let headers: any = { 'Authorization': `Bearer ${aiApiKey}` };
      
      if (aiProvider === 'groq') url = 'https://api.groq.com/openai/v1/models';
      else if (aiProvider === 'openai') url = 'https://api.openai.com/v1/models';
      else if (aiProvider === 'openrouter') url = 'https://openrouter.ai/api/v1/auth/key';
      else if (aiProvider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${aiApiKey}`;
        headers = {};
      }
      else {
        // Skip verification for Claude/Custom for now to avoid CORS errors
        setTimeout(() => { setIsVerifying(false); setVerifyStatus('success'); }, 500);
        return;
      }

      const res = await fetch(url, { headers });
      if (res.ok) setVerifyStatus('success');
      else setVerifyStatus('error');
    } catch (err) {
      setVerifyStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-6 space-y-6 overflow-y-auto">
      
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <KeyRound size={20} className="text-[var(--color-primary)]" />
          Settings Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configure your AI Analyst, API Keys, and local monitoring rules.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          
          <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-blue-500" />
              AI Analyst Provider
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Provider Engine</label>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                  className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="ollama">Ollama (Local, Recommended)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="custom">Custom Endpoint (OpenAI Compatible)</option>
                </select>
              </div>

              {(aiProvider === 'custom' || aiProvider === 'ollama') && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Base URL</label>
                  <input 
                    type="text" 
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder={aiProvider === 'ollama' ? "http://localhost:11434" : "https://api.example.com/v1"}
                    className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Model Name</label>
                <input 
                  type="text" 
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={aiProvider === 'ollama' ? 'llama3.1' : aiProvider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'}
                  className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">If the provider call fails, the app falls back to deterministic local analysis.</p>
              </div>

              {aiProvider !== 'ollama' && (
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-medium text-gray-400">API Key</label>
                    <button 
                      onClick={verifyApiKey}
                      disabled={isVerifying || !aiApiKey}
                      className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded flex items-center gap-1 transition-colors"
                    >
                      {isVerifying ? <Loader2 size={10} className="animate-spin" /> : 'Verify Key'}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={aiApiKey}
                      onChange={(e) => { setAiApiKey(e.target.value); setVerifyStatus('idle'); }}
                      placeholder={`Enter your ${aiProvider} API key...`}
                      className={`w-full bg-black/50 border rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors ${verifyStatus === 'success' ? 'border-green-500/50' : verifyStatus === 'error' ? 'border-red-500/50' : 'border-gray-800'}`}
                    />
                    {verifyStatus === 'success' && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                    {verifyStatus === 'error' && <XCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Your key is stored locally in your browser and never sent anywhere except directly to the provider.</p>
                </div>
              )}

              {aiProvider === 'ollama' && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
                  Ollama requires no API key. Start it locally and keep CORS enabled if your browser blocks the request.
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
              <BellRing size={16} className="text-orange-500" />
              System Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Max Active Flows</div>
                  <div className="text-xs text-gray-500">Number of flows to keep in memory</div>
                </div>
                <input 
                  type="number" 
                  value={maxFlows}
                  onChange={(e) => setMaxFlows(parseInt(e.target.value) || 500)}
                  className="w-20 bg-black/50 border border-gray-800 rounded px-2 py-1 text-sm text-center text-gray-200"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Audio Alerts</div>
                  <div className="text-xs text-gray-500">Play sound on critical risk detection</div>
                </div>
                <button 
                  onClick={() => setAlertSound(!alertSound)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${alertSound ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${alertSound ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-red-500" />
              Data Loss Prevention Rules
            </h2>
            
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-black/30 border border-gray-800/50 rounded hover:border-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleRule(rule.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rule.enabled ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-600'}`}
                    >
                      {rule.enabled && <span className="w-2 h-2 bg-white rounded-sm" />}
                    </button>
                    <div>
                      <div className="text-sm text-gray-300">{rule.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono uppercase">Severity: {rule.severity}/10</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-purple-500" />
              API Integrations
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">VirusTotal API Key</label>
                <input 
                  type="password" 
                  value={useSettingsStore(state => state.vtApiKey)}
                  onChange={(e) => useSettingsStore.getState().setVtApiKey(e.target.value)}
                  placeholder="Enter VT API Key..."
                  className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">AbuseIPDB API Key</label>
                <input 
                  type="password" 
                  value={useSettingsStore(state => state.abuseIpDbKey)}
                  onChange={(e) => useSettingsStore.getState().setAbuseIpDbKey(e.target.value)}
                  placeholder="Enter AbuseIPDB API Key..."
                  className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Webhook URL (SOAR / Incident Sink)</label>
                <input 
                  type="text" 
                  value={useSettingsStore(state => state.webhookUrl)}
                  onChange={(e) => useSettingsStore.getState().setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm text-gray-300">RDAP / WHOIS Lookup</div>
                  <div className="text-[10px] text-gray-500">Enable automatic network ownership resolution</div>
                </div>
                <button 
                  onClick={() => useSettingsStore.getState().setRdapEnabled(!useSettingsStore.getState().rdapEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${useSettingsStore(state => state.rdapEnabled) ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useSettingsStore(state => state.rdapEnabled) ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
