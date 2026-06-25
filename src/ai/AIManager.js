// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 12/20 — Local LLM Core
// File: src/ai/AIManager.js
// Generated: 2026-06-24

import localLLM from './localLLM';
import aiClient from './aiClient';

class AIManager {
  constructor() {
    this.preferLocal = true;
    this.fallbackEnabled = true;
  }

  setPreferLocal(value) {
    this.preferLocal = value;
  }

  setFallbackEnabled(value) {
    this.fallbackEnabled = value;
  }

  async generate(prompt, options = {}) {
    const useLocal = this.preferLocal && options.useLocal !== false;

    if (useLocal) {
      try {
        const localResponse = await localLLM.generate(prompt, {
          maxTokens: options.maxTokens || 512,
          temperature: options.temperature || 0.7,
          stop: options.stop,
        });
        return {
          source: 'local',
          response: localResponse,
          model: localLLM.currentModel,
          latency: null,
        };
      } catch (localError) {
        console.log('[AIManager] Local LLM failed:', localError.message);

        if (!this.fallbackEnabled || options.fallback === false) {
          throw new Error(`Local LLM failed and fallback is disabled: ${localError.message}`);
        }

        console.log('[AIManager] Falling back to cloud provider...');
        return this._cloudGenerate(prompt, options);
      }
    }

    return this._cloudGenerate(prompt, options);
  }

  async generateStream(prompt, options = {}, onToken = () => {}) {
    const useLocal = this.preferLocal && options.useLocal !== false;

    if (useLocal) {
      try {
        const startTime = Date.now();
        let firstToken = true;

        const wrappedOnToken = (token, fullText) => {
          if (firstToken) {
            firstToken = false;
          }
          onToken(token, fullText, { source: 'local', model: localLLM.currentModel });
        };

        const fullText = await localLLM.generateStream(prompt, {
          maxTokens: options.maxTokens || 512,
          temperature: options.temperature || 0.7,
          stop: options.stop,
        }, wrappedOnToken);

        return {
          source: 'local',
          response: fullText,
          model: localLLM.currentModel,
          latency: Date.now() - startTime,
        };
      } catch (localError) {
        console.log('[AIManager] Local LLM stream failed:', localError.message);

        if (!this.fallbackEnabled || options.fallback === false) {
          throw new Error(`Local LLM stream failed and fallback is disabled: ${localError.message}`);
        }

        console.log('[AIManager] Falling back to cloud streaming...');
        return this._cloudGenerateStream(prompt, options, onToken);
      }
    }

    return this._cloudGenerateStream(prompt, options, onToken);
  }

  async isLocalAvailable() {
    try {
      const status = await localLLM.getStatus();
      if (!status.modelDownloaded) return false;
      if (!status.serverRunning) {
        await localLLM.startServer();
      }
      return await localLLM.isServerRunning();
    } catch {
      return false;
    }
  }

  async getStatus() {
    const localStatus = await localLLM.getStatus();
    return {
      local: localStatus,
      preferLocal: this.preferLocal,
      fallbackEnabled: this.fallbackEnabled,
    };
  }

  async _cloudGenerate(prompt, options) {
    const provider = options.fallbackProvider || 'groq';
    const startTime = Date.now();

    try {
      const cloudResponse = await aiClient.stream(prompt, {
        provider: provider,
        maxTokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
      });

      return {
        source: 'cloud',
        response: cloudResponse,
        provider: provider,
        latency: Date.now() - startTime,
      };
    } catch (cloudError) {
      console.error('[AIManager] Cloud fallback failed:', cloudError.message);
      throw new Error(`Both local and cloud AI failed. Cloud error: ${cloudError.message}`);
    }
  }

  async _cloudGenerateStream(prompt, options, onToken) {
    const provider = options.fallbackProvider || 'groq';
    const startTime = Date.now();

    try {
      const wrappedOnToken = (token, fullText) => {
        onToken(token, fullText, { source: 'cloud', provider });
      };

      const fullText = await aiClient.stream(prompt, {
        provider: provider,
        maxTokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        streamCallback: wrappedOnToken,
      });

      return {
        source: 'cloud',
        response: fullText,
        provider: provider,
        latency: Date.now() - startTime,
      };
    } catch (cloudError) {
      console.error('[AIManager] Cloud stream fallback failed:', cloudError.message);
      throw new Error(`Both local and cloud AI streaming failed. Cloud error: ${cloudError.message}`);
    }
  }
}

export default new AIManager();
