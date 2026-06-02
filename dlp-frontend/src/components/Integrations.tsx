import { Network, Database, ShieldAlert, Cpu, CheckCircle2, XCircle, Webhook, FileDown, Globe2 } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useNavigate } from 'react-router-dom';

export default function Integrations() {
  const navigate = useNavigate();
  const { aiProvider, aiApiKey, vtApiKey, abuseIpDbKey, geoIpConfigured, rdapEnabled, webhookUrl } = useSettingsStore();

  const providers = [
    {
      category: 'Enrichment',
      icon: <Database className="text-blue-500" size={24} />,
      name: 'Local GeoIP & ASN (Built-in)',
      description: 'Adds country/region confidence, ASN, and organization context. Suppresses misleading map points for private, CDN-anycast, or low-confidence destinations.',
      status: geoIpConfigured ? 'active' : 'degraded',
      configurable: false,
      note: geoIpConfigured ? 'Active in demo/local mode; backend can replace this with MaxMind or another DB.' : 'Map is hidden when confidence is weak.'
    },
    {
      category: 'Enrichment',
      icon: <Globe2 className="text-cyan-500" size={24} />,
      name: 'RDAP / WHOIS Lookup',
      description: 'Explains unresolved destinations with registrant/network ownership when DNS/SNI is missing.',
      status: rdapEnabled ? 'active' : 'degraded',
      configurable: true,
      note: rdapEnabled ? 'Uses provider/ASN context when exact domain identity is unavailable.' : 'Unresolved rows still show a reason instead of Unknown / Unknown.'
    },
    {
      category: 'Reputation',
      icon: <ShieldAlert className="text-orange-500" size={24} />,
      name: 'AbuseIPDB',
      description: 'Checks destination IPs against crowd-sourced malicious activity reports.',
      status: abuseIpDbKey ? 'active' : 'degraded',
      configurable: true,
      note: 'Without an API key, relies only on local risk heuristics.'
    },
    {
      category: 'Reputation',
      icon: <Network className="text-purple-500" size={24} />,
      name: 'VirusTotal',
      description: 'Checks resolved domains and hashes against third-party reputation signals.',
      status: vtApiKey ? 'active' : 'degraded',
      configurable: true,
      note: 'Without an API key, domain reputation scoring is disabled.'
    },
    {
      category: 'AI Analysis',
      icon: <Cpu className="text-green-500" size={24} />,
      name: 'AI Analyst Engine',
      description: 'Summarizes alerts, explains risk signals, lists false positives, and recommends investigation steps. Supports Ollama, Groq, OpenRouter, OpenAI, Gemini, Claude, and OpenAI-compatible endpoints.',
      status: aiProvider === 'ollama' || aiApiKey ? 'active' : 'degraded',
      configurable: true,
      note: aiProvider === 'ollama' || aiApiKey ? `Currently using: ${aiProvider.toUpperCase()}` : 'No key configured; deterministic local analysis still works.'
    },
    {
      category: 'Export / Workflow',
      icon: <Webhook className="text-pink-500" size={24} />,
      name: 'Webhook Incident Sink',
      description: 'Sends structured alert evidence to a SOAR, ticketing system, or custom receiver.',
      status: webhookUrl ? 'active' : 'degraded',
      configurable: true,
      note: webhookUrl ? 'Webhook URL configured.' : 'Exports remain available as local JSON, CSV, Markdown, and IOC copy actions.'
    },
    {
      category: 'Export / Workflow',
      icon: <FileDown className="text-emerald-500" size={24} />,
      name: 'Evidence Export',
      description: 'Copies IOC bundles and exports enriched flow evidence for review, handoff, or incident notes.',
      status: 'active',
      configurable: false,
      note: 'Works fully offline from enriched in-memory telemetry.'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-6 space-y-6 overflow-y-auto">
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          Integrations Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage external data sources for flow enrichment and analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((p, idx) => (
          <div key={idx} className="bg-[#111] border border-gray-800 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-lg border border-gray-800">
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="text-gray-200 font-medium">{p.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">{p.category}</span>
                  </div>
                </div>
                {p.status === 'active' ? (
                  <div className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                    <CheckCircle2 size={12} /> Active
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                    <XCircle size={12} /> Degraded Mode
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">{p.description}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-800/50 flex justify-between items-center">
              <span className="text-xs text-gray-500 italic">{p.note}</span>
              {p.configurable && (
                <button 
                  onClick={() => navigate('/settings')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Configure
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
