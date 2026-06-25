// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 6/20 — AI Chat Engine
// File: src/ai/aiClient.js
// Generated: 2026-06-24

/**
 * AI Chat Client with SSE Streaming
 * Supports: OpenAI GPT-4o-mini, Gemini 1.5 Flash, Groq Llama3-8B
 * Protocol: Server-Sent Events (SSE) streaming via built-in fetch
 * Features: Real-time token streaming, mid-stream stop, provider-specific error handling
 */

const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    getHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, model) => ({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    parseStreamLine: (line) => {
      const jsonStr = line.replace(/^data:\s*/, '').trim();
      if (jsonStr === '[DONE]') {
        return { done: true, text: '' };
      }
      try {
        const data = JSON.parse(jsonStr);
        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === 'string' && content.length > 0) {
          return { done: false, text: content };
        }
        return { done: false, text: '' };
      } catch {
        return { done: false, text: '' };
      }
    },
    getErrorUrl: () => 'https://platform.openai.com/api-keys',
  },

  groq: {
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama3-8b-8192',
    getHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, model) => ({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    parseStreamLine: (line) => {
      const jsonStr = line.replace(/^data:\s*/, '').trim();
      if (jsonStr === '[DONE]') {
        return { done: true, text: '' };
      }
      try {
        const data = JSON.parse(jsonStr);
        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === 'string' && content.length > 0) {
          return { done: false, text: content };
        }
        return { done: false, text: '' };
      } catch {
        return { done: false, text: '' };
      }
    },
    getErrorUrl: () => 'https://console.groq.com/keys',
  },

  gemini: {
    name: 'Gemini',
    endpoint: (apiKey) => 
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?alt=sse&key=${apiKey}`,
    model: 'gemini-1.5-flash-latest',
    getHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (messages) => {
      let systemInstruction = null;
      const contents = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction = { parts: [{ text: msg.content }] };
          continue;
        }
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      const body = { contents };
      if (systemInstruction) {
        body.systemInstruction = systemInstruction;
      }
      return body;
    },
    parseStreamLine: (line) => {
      const jsonStr = line.replace(/^data:\s*/, '').trim();
      if (!jsonStr) {
        return { done: false, text: '' };
      }
      try {
        const data = JSON.parse(jsonStr);
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'UNKNOWN') {
          return { done: true, text: '' };
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string' && text.length > 0) {
          return { done: false, text };
        }
        return { done: false, text: '' };
      } catch {
        return { done: false, text: '' };
      }
    },
    getErrorUrl: () => 'https://aistudio.google.com/app/apikey',
  },
};

export class AIChatClient {
  constructor(provider, apiKey) {
    if (!PROVIDER_CONFIG[provider]) {
      throw new Error(`Unknown AI provider: ${provider}`);
    }
    this.provider = provider;
    this.apiKey = apiKey;
    this.isStreaming = false;
    this.config = PROVIDER_CONFIG[provider];
    this.abortController = null;
  }

  /**
   * Stop the ongoing stream generation
   */
  stop() {
    this.isStreaming = false;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // Ignore abort errors
      }
      this.abortController = null;
    }
  }

  /**
   * Stream chat completion with SSE
   * @param {Array<{role:string, content:string}>} messages - Chat messages
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onToken - Called for each token chunk
   * @param {Function} callbacks.onError - Called on error
   * @param {Function} callbacks.onDone - Called when stream completes or stops
   */
  async streamChat(messages, callbacks) {
    const { onToken, onError, onDone } = callbacks;

    if (!this.apiKey || this.apiKey.trim().length === 0) {
      onError?.(new Error(`No API key configured for ${this.config.name}. Add it in Settings.`));
      onDone?.();
      return;
    }

    this.isStreaming = true;
    this.abortController = typeof AbortController !== 'undefined' 
      ? new AbortController() 
      : null;

    try {
      const endpoint = typeof this.config.endpoint === 'function'
        ? this.config.endpoint(this.apiKey)
        : this.config.endpoint;

      const headers = typeof this.config.getHeaders === 'function'
        ? this.config.getHeaders(this.apiKey)
        : this.config.getHeaders();

      const body = this.config.buildBody(messages, this.config.model);

      const fetchOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      };

      if (this.abortController) {
        fetchOptions.signal = this.abortController.signal;
      }

      const response = await fetch(endpoint, fetchOptions);

      if (!response.ok) {
        const errorMsg = this._getErrorMessage(response.status);
        throw new Error(errorMsg);
      }

      if (!response.body || typeof response.body.getReader !== 'function') {
        throw new Error('Streaming not supported in this environment');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (this.isStreaming) {
        let readResult;
        try {
          readResult = await reader.read();
        } catch (readErr) {
          if (readErr.name === 'AbortError') {
            break;
          }
          throw readErr;
        }

        const { done, value } = readResult;
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) {
            continue;
          }

          const result = this.config.parseStreamLine(trimmed);
          if (result.text) {
            onToken?.(result.text);
          }
          if (result.done) {
            this.isStreaming = false;
            onDone?.();
            return;
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim().startsWith('data:')) {
        const result = this.config.parseStreamLine(buffer.trim());
        if (result.text) {
          onToken?.(result.text);
        }
        if (result.done) {
          this.isStreaming = false;
          onDone?.();
          return;
        }
      }

      onDone?.();
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        onDone?.();
        return;
      }
      onError?.(error);
      onDone?.();
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  _getErrorMessage(status) {
    const name = this.config.name;
    const url = this.config.getErrorUrl();

    if (status === 401 || status === 403) {
      return `Invalid API key for ${name} — check at ${url}`;
    }
    if (status === 429) {
      return `Rate limit hit on ${name} — free tier: wait 1 min / paid: check billing`;
    }
    if (status >= 500 && status < 600) {
      return `Server issues on ${name} — try again later`;
    }
    return `HTTP ${status} error from ${name}`;
  }
}

export function getSupportedProviders() {
  return Object.keys(PROVIDER_CONFIG).map(key => ({
    key,
    name: PROVIDER_CONFIG[key].name,
    model: PROVIDER_CONFIG[key].model,
    keyUrl: PROVIDER_CONFIG[key].getErrorUrl(),
  }));
}

export function getProviderName(provider) {
  return PROVIDER_CONFIG[provider]?.name || provider;
}

export default AIChatClient;
