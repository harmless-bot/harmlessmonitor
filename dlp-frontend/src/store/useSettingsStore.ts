import { create } from 'zustand';

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  severity: number;
}

interface SettingsState {
  // Views
  activeView: 'SANKEY' | 'MAP' | 'HISTORY' | 'SETTINGS';
  
  // Display Settings
  maxFlows: number;
  alertSound: boolean;
  graphRefreshRate: number;
  
  // AI Settings
  aiProvider: 'gemini' | 'openai' | 'claude' | 'ollama' | 'openrouter' | 'groq' | 'custom';
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;

  
  // Rules
  rules: Rule[];
  
  // Integrations
  vtApiKey: string;
  abuseIpDbKey: string;
  geoIpConfigured: boolean;
  rdapEnabled: boolean;
  webhookUrl: string;
  
  // Actions
  setActiveView: (view: 'SANKEY' | 'MAP' | 'HISTORY' | 'SETTINGS') => void;
  toggleRule: (id: string) => void;
  setMaxFlows: (val: number) => void;
  setAlertSound: (val: boolean) => void;
  setGraphRefreshRate: (val: number) => void;
  setAiProvider: (provider: 'gemini' | 'openai' | 'claude' | 'ollama' | 'openrouter' | 'groq' | 'custom') => void;
  setAiApiKey: (key: string) => void;
  setAiBaseUrl: (url: string) => void;
  setAiModel: (model: string) => void;
  setWebhookUrl: (url: string) => void;
  setVtApiKey: (key: string) => void;
  setAbuseIpDbKey: (key: string) => void;
  setRdapEnabled: (enabled: boolean) => void;
}
export const useSettingsStore = create<SettingsState>((set) => ({
  activeView: 'SANKEY',
  
  maxFlows: 30,
  alertSound: false,
  graphRefreshRate: 1000,
  
  aiProvider: 'ollama',
  aiApiKey: '',
  aiBaseUrl: 'http://localhost:11434',
  aiModel: 'llama3.1',
  
  rules: [
    { id: 'CREDIT_CARD', name: 'Credit Cards', enabled: true, severity: 8 },
    { id: 'SSN', name: 'Social Security Numbers', enabled: true, severity: 10 },
    { id: 'JWT', name: 'JWT Tokens', enabled: true, severity: 7 },
    { id: 'API_KEY', name: 'API Keys', enabled: true, severity: 9 },
    { id: 'PRIVATE_KEY', name: 'Private Keys', enabled: true, severity: 10 },
    { id: 'EMAIL_BULK', name: 'Email Dumps', enabled: true, severity: 6 },
  ],
  
  vtApiKey: '',
  abuseIpDbKey: '',
  geoIpConfigured: true,
  rdapEnabled: true,
  webhookUrl: '',

  setActiveView: (view) => set({ activeView: view }),
  
  toggleRule: (id) => set((state) => ({
    rules: state.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
  })),
  
  setMaxFlows: (val) => set({ maxFlows: val }),
  setAlertSound: (val) => set({ alertSound: val }),
  setGraphRefreshRate: (val) => set({ graphRefreshRate: val }),
  setAiProvider: (val) => set({ aiProvider: val }),
  setAiApiKey: (val) => set({ aiApiKey: val }),
  setAiBaseUrl: (val) => set({ aiBaseUrl: val }),
  setAiModel: (val) => set({ aiModel: val }),
  setWebhookUrl: (val) => set({ webhookUrl: val }),
  setVtApiKey: (val) => set({ vtApiKey: val }),
  setAbuseIpDbKey: (val) => set({ abuseIpDbKey: val }),
  setRdapEnabled: (val) => set({ rdapEnabled: val }),
}));
