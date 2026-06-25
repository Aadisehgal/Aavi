// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 12/20 — Local LLM Core
// File: src/ai/localLLM.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { LocalLLM } = NativeModules;

const SERVER_PORT = 8080;
const SERVER_HOST = '127.0.0.1';
const MODELS_DIR = '/data/data/com.manu.ai/files/models';

const MODELS = {
  'tinyllama-1.1b': {
    file: 'tinyllama-1.1b-q4_k_m.gguf',
    ram: 2048,
    size: '600MB',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
  },
  'phi-2': {
    file: 'phi-2-q4_k_m.gguf',
    ram: 4096,
    size: '1.6GB',
    url: 'https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf',
  },
  'llama-2-7b': {
    file: 'llama-2-7b-q4_k_m.gguf',
    ram: 6144,
    size: '3.8GB',
    url: 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf',
  },
};

class LocalLLMManager {
  constructor() {
    this.currentModel = null;
    this.serverRunning = false;
    this.serverCheckInterval = null;
  }

  async getDeviceRAM() {
    if (Platform.OS === 'android' && LocalLLM && LocalLLM.getTotalMemory) {
      try {
        const ram = await LocalLLM.getTotalMemory();
        return Math.round(ram / (1024 * 1024));
      } catch (e) {
        console.warn('[LocalLLM] getDeviceRAM native error:', e.message);
      }
    }
    return 4096;
  }

  async selectOptimalModel() {
    const ram = await this.getDeviceRAM();
    if (ram >= 6144) return 'llama-2-7b';
    if (ram >= 4096) return 'phi-2';
    return 'tinyllama-1.1b';
  }

  async isModelDownloaded(modelKey) {
    const model = MODELS[modelKey];
    if (!model) return false;
    if (Platform.OS === 'android' && LocalLLM && LocalLLM.isFileExists) {
      try {
        return await LocalLLM.isFileExists(`${MODELS_DIR}/${model.file}`);
      } catch (e) {
        console.warn('[LocalLLM] isModelDownloaded error:', e.message);
        return false;
      }
    }
    return false;
  }

  async downloadModel(modelKey, onProgress = () => {}) {
    const model = MODELS[modelKey];
    if (!model) throw new Error(`Unknown model: ${modelKey}`);

    const alreadyDownloaded = await this.isModelDownloaded(modelKey);
    if (alreadyDownloaded) {
      onProgress({ status: 'already_downloaded', progress: 100 });
      return true;
    }

    if (Platform.OS === 'android' && LocalLLM && LocalLLM.downloadModel) {
      try {
        return await LocalLLM.downloadModel(model.url, `${MODELS_DIR}/${model.file}`, onProgress);
      } catch (e) {
        console.error('[LocalLLM] downloadModel error:', e.message);
        throw e;
      }
    }

    throw new Error('Model download not available on this platform');
  }

  async startServer() {
    if (this.serverRunning) return true;

    const modelKey = await this.selectOptimalModel();
    const model = MODELS[modelKey];

    const downloaded = await this.isModelDownloaded(modelKey);
    if (!downloaded) {
      throw new Error(`Model ${modelKey} not downloaded. Call downloadModel() first.`);
    }

    if (Platform.OS === 'android' && LocalLLM && LocalLLM.startServer) {
      try {
        await LocalLLM.startServer(
          `${MODELS_DIR}/${model.file}`,
          SERVER_PORT,
          2048
        );
        this.currentModel = modelKey;
        this.serverRunning = true;
        this._startHealthCheck();
        return true;
      } catch (e) {
        console.error('[LocalLLM] startServer error:', e.message);
        throw e;
      }
    }

    throw new Error('Local LLM server not available on this platform');
  }

  async stopServer() {
    if (this.serverCheckInterval) {
      clearInterval(this.serverCheckInterval);
      this.serverCheckInterval = null;
    }

    if (Platform.OS === 'android' && LocalLLM && LocalLLM.stopServer) {
      try {
        await LocalLLM.stopServer();
      } catch (e) {
        console.warn('[LocalLLM] stopServer error:', e.message);
      }
    }

    this.serverRunning = false;
    this.currentModel = null;
    return true;
  }

  async isServerRunning() {
    if (!this.serverRunning) return false;
    try {
      const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/health`, {
        method: 'GET',
        timeout: 2000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async generate(prompt, options = {}) {
    if (!this.serverRunning || !this.currentModel) {
      await this.startServer();
    }

    const maxTokens = options.maxTokens || 512;
    const temperature = options.temperature || 0.7;
    const stop = options.stop || ['</s>', 'User:', 'Assistant:'];

    const payload = {
      prompt: prompt,
      n_predict: maxTokens,
      temperature: temperature,
      stop: stop,
      stream: false,
    };

    try {
      const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 60000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content || data.text || data.completion || '';
    } catch (e) {
      console.error('[LocalLLM] generate error:', e.message);
      throw e;
    }
  }

  async generateStream(prompt, options = {}, onToken = () => {}) {
    if (!this.serverRunning || !this.currentModel) {
      await this.startServer();
    }

    const maxTokens = options.maxTokens || 512;
    const temperature = options.temperature || 0.7;
    const stop = options.stop || ['</s>', 'User:', 'Assistant:'];

    const payload = {
      prompt: prompt,
      n_predict: maxTokens,
      temperature: temperature,
      stop: stop,
      stream: true,
    };

    try {
      const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 60000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6);
              const jsonData = JSON.parse(jsonStr);
              if (jsonData.content) {
                fullText += jsonData.content;
                onToken(jsonData.content, fullText);
              }
            } catch {
              // Ignore malformed JSON in stream
            }
          }
        }
      }

      return fullText;
    } catch (e) {
      console.error('[LocalLLM] generateStream error:', e.message);
      throw e;
    }
  }

  async getStatus() {
    const ram = await this.getDeviceRAM();
    const modelKey = await this.selectOptimalModel();
    const model = MODELS[modelKey];

    return {
      deviceRAM: ram,
      recommendedModel: modelKey,
      currentModel: this.currentModel,
      serverRunning: this.serverRunning,
      modelDownloaded: await this.isModelDownloaded(modelKey),
      modelSize: model.size,
      modelRAM: model.ram,
    };
  }

  getAvailableModels() {
    return Object.keys(MODELS).map((key) => ({
      key,
      ...MODELS[key],
    }));
  }

  _startHealthCheck() {
    if (this.serverCheckInterval) clearInterval(this.serverCheckInterval);
    this.serverCheckInterval = setInterval(async () => {
      const alive = await this.isServerRunning();
      if (!alive) {
        this.serverRunning = false;
        this.currentModel = null;
      }
    }, 10000);
  }
}

export default new LocalLLMManager();
