import { NativeModules, Platform } from 'react-native';

const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent',
};

class AIClient {
  constructor() {
    this.abortController = null;
    this.currentProvider = 'groq';
    this.apiKeys = {};
  }

  setProvider(provider) {
    this.currentProvider = provider;
  }

  setApiKey(provider, key) {
    this.apiKeys[provider] = key;
  }

  async streamChatCompletion(messages, onChunk, onError, onComplete) {
    try {
      const provider = this.currentProvider;
      const apiKey = this.apiKeys[provider];

      if (!apiKey) {
        onError(`No API key set for ${provider}. Go to Settings > AI Providers.`);
        return;
      }

      this.abortController = new AbortController();

      let url, body, headers;

      if (provider === 'gemini') {
        url = `${API_ENDPOINTS.gemini}?alt=sse&key=${apiKey}`;
        const systemMsg = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const contents = [];
        if (systemMsg) {
          contents.push({ role: 'user', parts: [{ text: systemMsg.content }] });
          contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
        }
        chatMessages.forEach(m => {
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          });
        });

        body = JSON.stringify({ contents });
        headers = { 'Content-Type': 'application/json' };
      } else {
        url = API_ENDPOINTS[provider];
        body = JSON.stringify({
          model: provider === 'openai' ? 'gpt-4o-mini' : 'llama3-8b-8192',
          messages,
          stream: true,
          max_tokens: 2048,
        });
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          const urlMap = {
            openai: 'platform.openai.com/billing',
            gemini: 'aistudio.google.com/apikey',
            groq: 'console.groq.com/keys',
          };
          onError(`Invalid API key for ${provider}. Check your key at ${urlMap[provider]}`);
        } else if (status === 429) {
          onError(`Rate limit or quota exceeded for ${provider}. Wait a moment or check your plan.`);
        } else if (status >= 500) {
          onError(`${provider} servers are having issues. Try again later.`);
        } else {
          const text = await response.text();
          onError(`Error ${status}: ${text.substring(0, 500)}`);
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('
');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const json = JSON.parse(data);
            let content = '';

            if (provider === 'gemini') {
              content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
              content = json.choices?.[0]?.delta?.content || '';
            }

            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }

      onComplete();
    } catch (error) {
      if (error.name === 'AbortError') {
        onComplete();
      } else {
        onError(`AI request failed: ${error.message}`);
      }
    }
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export default new AIClient();
