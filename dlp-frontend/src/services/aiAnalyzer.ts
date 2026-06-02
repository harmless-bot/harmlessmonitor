import type { Flow, PacketClassification } from '../types';
import { buildAnalystNarrative } from '../utils/flowAnalysis';

export async function analyzeThreatWithAI(
  threat: PacketClassification | Flow, 
  provider: 'gemini' | 'openai' | 'claude' | 'ollama' | 'openrouter' | 'groq' | 'custom',
  apiKey: string,
  baseUrl = '',
  model = ''
): Promise<string> {
  if ('risk_score' in threat) {
    return analyzeFlowWithAI(threat, provider, apiKey, baseUrl, model);
  }

  const prompt = `Analyze the following network threat alert:
  
Source IP: ${threat.src_ip}:${threat.src_port}
Destination IP: ${threat.dst_ip}:${threat.dst_port}
Protocol: ${threat.protocol}
Payload Size: ${threat.payload_size} bytes
Matched Rules: ${threat.matches.map(m => m.pattern_name).join(', ')}

Payload Snippets:
${threat.matches.map(m => `- [${m.pattern_name}] ${m.snippet}`).join('\n')}

Provide a concise risk assessment, potential impact, and recommended mitigation steps in Markdown format.`;

  try {
    if (!apiKey && provider !== 'ollama') {
      return `Local analysis fallback\n\nAPI key is not configured, so provider-backed analysis was skipped. The alert matched ${threat.matches.map(m => m.pattern_name).join(', ')} and should be reviewed for payload sensitivity, destination legitimacy, and process ownership.`;
    }

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error(`Gemini API Error: ${res.statusText}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from model.';
    } 
    else if (provider === 'openai') {
      const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error(`OpenAI API Error: ${res.statusText}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'No response from model.';
    }
    else if (provider === 'claude') {
      // Note: Anthropic generally blocks direct CORS requests from browsers for security.
      // We pass the direct-browser-access flag for local dev, but it may still fail if Anthropic blocks preflight.
      const res = await fetch(`https://api.anthropic.com/v1/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error(`Claude API Error: ${res.statusText}`);
      const data = await res.json();
      return data.content?.[0]?.text || 'No response from model.';
    }
    throw new Error('Unsupported provider.');
  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze threat.');
  }
}

export async function analyzeFlowWithAI(
  flow: Flow,
  provider: 'gemini' | 'openai' | 'claude' | 'ollama' | 'openrouter' | 'groq' | 'custom',
  apiKey: string,
  baseUrl = '',
  model = '',
  question = ''
): Promise<string> {
  const localNarrative = buildAnalystNarrative(flow, question, apiKey || provider === 'ollama' ? provider : 'local heuristic analyst');
  const prompt = `${localNarrative}

Return a concise incident analysis with: verdict, why flagged, confidence, false positives, and next steps.`;

  if (!apiKey && provider !== 'ollama') {
    return localNarrative;
  }

  try {
    if (provider === 'ollama') {
      const res = await fetch(`${baseUrl || 'http://localhost:11434'}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama3.1', prompt, stream: false })
      });
      if (!res.ok) throw new Error(`Ollama API Error: ${res.statusText}`);
      const data = await res.json();
      return data.response || localNarrative;
    }

    const openAiCompatible =
      provider === 'openai' ? 'https://api.openai.com/v1' :
      provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
      provider === 'groq' ? 'https://api.groq.com/openai/v1' :
      provider === 'custom' ? (baseUrl || 'http://localhost:8000/v1') :
      '';

    if (openAiCompatible) {
      const res = await fetch(`${openAiCompatible}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'),
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`${provider} API Error: ${res.statusText}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || localNarrative;
    }

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error(`Gemini API Error: ${res.statusText}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || localNarrative;
    }

    if (provider === 'claude') {
      const res = await fetch(`https://api.anthropic.com/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: model || 'claude-3-haiku-20240307', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error(`Claude API Error: ${res.statusText}`);
      const data = await res.json();
      return data.content?.[0]?.text || localNarrative;
    }
  } catch (error) {
    return `${localNarrative}\n\nProvider note: live ${provider} call failed, so this answer used local deterministic analysis.`;
  }

  return localNarrative;
}
