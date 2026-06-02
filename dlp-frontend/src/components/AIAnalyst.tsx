import { useState } from 'react';
import { BrainCircuit, Send, Bot, ShieldAlert, KeyRound } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useDlpStore } from '../store/useDlpStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { analyzeFlowWithAI } from '../services/aiAnalyzer';
import { formatBytes, getDestinationIdentity } from '../utils/flowAnalysis';

export default function AIAnalyst() {
  const flows = useDlpStore(state => state.flows);
  const investigatingFlow = useDlpStore(state => state.investigatingFlow);
  const setInvestigatingFlow = useDlpStore(state => state.setInvestigatingFlow);
  
  const aiProvider = useSettingsStore(state => state.aiProvider);
  const aiApiKey = useSettingsStore(state => state.aiApiKey);
  const aiBaseUrl = useSettingsStore(state => state.aiBaseUrl);
  const aiModel = useSettingsStore(state => state.aiModel);
  
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!investigatingFlow && !prompt) return;

    setIsAnalyzing(true);
    
    let context = prompt.trim();
    if (investigatingFlow && prompt.trim() === '') {
      context = `Analyze ${getDestinationIdentity(investigatingFlow)} for exfiltration risk.`;
    }

    setChatHistory(prev => [...prev, { role: 'user', content: context }]);
    setPrompt('');

    try {
      const targetFlow = investigatingFlow || [...flows].sort((a, b) => b.risk_score - a.risk_score)[0];
      const content = targetFlow
        ? await analyzeFlowWithAI(targetFlow, aiProvider, aiApiKey, aiBaseUrl, aiModel, context)
        : 'No flow context is available yet. Start the backend WebSocket or use demo mode to generate analyzable telemetry.';
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Analysis failed.'
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Left sidebar - Flow selection */}
      <div className="w-80 border-r border-gray-800 bg-[#111] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-200">Select Context</h2>
          <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">{flows.length} available</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {flows.map(flow => (
            <div 
              key={flow.flow_id}
              onClick={() => setInvestigatingFlow(flow)}
              className={`p-3 rounded border cursor-pointer transition-colors ${
                investigatingFlow?.flow_id === flow.flow_id 
                  ? 'bg-blue-500/10 border-blue-500/50' 
                  : 'bg-black/20 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-gray-300 truncate w-3/4">{getDestinationIdentity(flow)}</span>
                {flow.risk_level === 'critical' && <ShieldAlert size={14} className="text-red-500" />}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                {formatBytes(flow.bytes_out)} outbound • risk {flow.risk_score}
              </div>
            </div>
          ))}
          {flows.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No flows available for analysis.
            </div>
          )}
        </div>
      </div>

      {/* Main AI Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="h-14 border-b border-gray-800 flex justify-between items-center px-6 bg-[#111]">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-[var(--color-primary)]" size={20} />
            <h1 className="font-semibold text-gray-200">Autonomous AI Analyst</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {!aiApiKey && aiProvider !== 'ollama' && (
              <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-full border border-orange-400/20">
                <KeyRound size={12} />
                Local fallback active
              </div>
            )}
            <div className="text-xs font-mono px-3 py-1.5 bg-gray-800 rounded text-gray-300 border border-gray-700">
              Provider: <span className="text-blue-400 uppercase">{aiProvider}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <Bot size={48} className="text-gray-700 opacity-50" />
              <p className="max-w-md text-center text-sm">
                Select a network flow from the left to provide context, or just type a prompt below to ask questions about current network activity.
              </p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                    <BrainCircuit size={16} className="text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[70%] p-4 rounded-lg text-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#222] border border-gray-700 text-gray-200 font-sans whitespace-pre-wrap' 
                    : 'bg-blue-900/10 border border-blue-900/30 text-gray-300 leading-relaxed'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="markdown-body space-y-3">
                      <ReactMarkdown 
                        components={{
                          p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({node, ...props}: any) => <strong className="font-semibold text-gray-200" {...props} />,
                          ul: ({node, ...props}: any) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                          ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
                          li: ({node, ...props}: any) => <li className="text-gray-300" {...props} />,
                          h1: ({node, ...props}: any) => <h1 className="text-lg font-bold text-gray-100 mb-3 mt-4" {...props} />,
                          h2: ({node, ...props}: any) => <h2 className="text-base font-bold text-gray-100 mb-2 mt-4" {...props} />,
                          h3: ({node, ...props}: any) => <h3 className="text-sm font-bold text-gray-200 mb-2 mt-3" {...props} />,
                          code: ({node, className, ...props}: any) => {
                            const isInline = !className || !className.includes('language-');
                            return isInline 
                              ? <code className="px-1 py-0.5 bg-black/40 rounded text-blue-300 font-mono text-xs" {...props} />
                              : <code className="block p-3 bg-black/40 rounded-lg text-blue-300 font-mono text-xs overflow-x-auto my-3" {...props} />;
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-gray-400">ME</span>
                  </div>
                )}
              </div>
            ))
          )}
          {isAnalyzing && (
            <div className="flex gap-4">
               <div className="w-8 h-8 rounded bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                  <BrainCircuit size={16} className="text-blue-400 animate-pulse" />
                </div>
                <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </span>
                  Analyzing {investigatingFlow ? 'flow context' : 'prompt'} with {aiProvider}...
                </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#111] flex flex-col gap-2">
          {investigatingFlow && (
            <div className="flex items-center gap-2 self-start bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-md text-xs font-mono border border-blue-500/20">
              <span className="opacity-70">Attached Context:</span> 
              <span className="font-semibold">{getDestinationIdentity(investigatingFlow)}</span>
              <button onClick={() => setInvestigatingFlow(null)} className="ml-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-500/20 text-lg transition-colors">&times;</button>
            </div>
          )}
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder={investigatingFlow ? "Add specific questions about this flow (optional)..." : "Ask the AI Analyst something..."}
              className="w-full bg-black/50 border border-gray-800 rounded-lg py-3 pl-4 pr-12 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!prompt && !investigatingFlow)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--color-primary)] text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
