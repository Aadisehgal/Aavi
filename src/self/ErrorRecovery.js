import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/ErrorRecovery.js
// Generated: 2026-06-24
// Feature 113: Error Recovery Protocol — Crash se graceful recovery

import { NativeModules, AppState } from 'react-native';

const RECOVERY_STATE_KEY = '@manu_ai/recovery_state';
const RECOVERY_LOG_KEY = '@manu_ai/recovery_log';
const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_COOLDOWN_MS = 300000; // 5 minutes

class ErrorRecovery {
  constructor() {
    this.recoveryState = {};
    this.recoveryLog = [];
    this.recoveryStrategies = new Map();
    this.init();
  }

  async init() {
    await this.loadRecoveryState();
    await this.loadRecoveryLog();
    this.registerDefaultStrategies();
  }

  async loadRecoveryState() {
    try {
      const stored = await AsyncStorage.getItem(RECOVERY_STATE_KEY);
      this.recoveryState = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.recoveryState = {};
    }
  }

  async saveRecoveryState() {
    try {
      await AsyncStorage.setItem(RECOVERY_STATE_KEY, JSON.stringify(this.recoveryState));
    } catch (e) {}
  }

  async loadRecoveryLog() {
    try {
      const stored = await AsyncStorage.getItem(RECOVERY_LOG_KEY);
      this.recoveryLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.recoveryLog = [];
    }
  }

  async saveRecoveryLog() {
    try {
      await AsyncStorage.setItem(RECOVERY_LOG_KEY, JSON.stringify(this.recoveryLog.slice(-100)));
    } catch (e) {}
  }

  registerDefaultStrategies() {
    this.registerStrategy('NETWORK_ERROR', async (error, context) => {
      // Retry with exponential backoff
      const delay = Math.pow(2, context.attempt || 0) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return { retry: true, delay };
    });

    this.registerStrategy('STORAGE_ERROR', async (error, context) => {
      // Clear corrupted storage keys
      if (context.storageKey) {
        await AsyncStorage.removeItem(context.storageKey);
      }
      return { recovered: true, action: 'CLEARED_STORAGE' };
    });

    this.registerStrategy('MEMORY_ERROR', async (error, context) => {
      // Clear caches and temp data
      const keys = await AsyncStorage.getAllKeys();
      const tempKeys = keys.filter(k => k.startsWith('@manu_ai/temp_') || k.startsWith('@manu_ai/cache_'));
      if (tempKeys.length > 0) {
        await AsyncStorage.multiRemove(tempKeys);
      }
      return { recovered: true, action: 'CLEARED_CACHES' };
    });

    this.registerStrategy('RENDER_ERROR', async (error, context) => {
      // Fallback to safe mode rendering
      return { recovered: true, action: 'SAFE_MODE', safeMode: true };
    });

    this.registerStrategy('UNKNOWN', async (error, context) => {
      // Generic recovery: log and continue
      return { recovered: false, action: 'LOGGED' };
    });
  }

  registerStrategy(errorType, strategyFn) {
    this.recoveryStrategies.set(errorType, strategyFn);
  }

  async attemptRecovery(error, context = {}) {
    const errorType = this.classifyError(error);
    const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const state = this.recoveryState[errorType] || {
      attemptCount: 0,
      lastAttempt: 0,
      successCount: 0,
      failureCount: 0,
    };

    // Check cooldown
    if (Date.now() - state.lastAttempt < RECOVERY_COOLDOWN_MS) {
      return {
        recovered: false,
        reason: 'COOLDOWN_ACTIVE',
        retryAfter: state.lastAttempt + RECOVERY_COOLDOWN_MS - Date.now(),
      };
    }

    // Check max attempts
    if (state.attemptCount >= MAX_RECOVERY_ATTEMPTS) {
      return {
        recovered: false,
        reason: 'MAX_ATTEMPTS_EXCEEDED',
        suggestion: 'Manual intervention required',
      };
    }

    state.attemptCount += 1;
    state.lastAttempt = Date.now();

    const strategy = this.recoveryStrategies.get(errorType) || this.recoveryStrategies.get('UNKNOWN');
    let result;

    try {
      result = await strategy(error, { ...context, attempt: state.attemptCount });
      if (result.recovered || result.retry) {
        state.successCount += 1;
        state.attemptCount = 0; // Reset on success
      } else {
        state.failureCount += 1;
      }
    } catch (strategyError) {
      result = { recovered: false, error: strategyError.message };
      state.failureCount += 1;
    }

    this.recoveryState[errorType] = state;
    await this.saveRecoveryState();

    const logEntry = {
      id: recoveryId,
      timestamp: Date.now(),
      errorType,
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack || '',
      context,
      result,
      appState: AppState.currentState,
    };

    this.recoveryLog.push(logEntry);
    await this.saveRecoveryLog();

    return { ...result, recoveryId, errorType };
  }

  classifyError(error) {
    const message = (error.message || '').toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('storage') || message.includes('asyncstorage') || message.includes('sqlite') || message.includes('database')) {
      return 'STORAGE_ERROR';
    }
    if (message.includes('memory') || message.includes('heap') || message.includes('out of memory')) {
      return 'MEMORY_ERROR';
    }
    if (message.includes('render') || message.includes('invariant') || message.includes('element')) {
      return 'RENDER_ERROR';
    }
    return 'UNKNOWN';
  }

  async getRecoveryStats() {
    const stats = {};
    for (const [errorType, state] of Object.entries(this.recoveryState)) {
      stats[errorType] = {
        totalAttempts: state.attemptCount,
        successRate: state.successCount + state.failureCount > 0
          ? (state.successCount / (state.successCount + state.failureCount)).toFixed(2)
          : 'N/A',
        lastAttempt: state.lastAttempt,
      };
    }
    return stats;
  }

  async getRecoveryLog(filter = {}) {
    let logs = [...this.recoveryLog];
    if (filter.errorType) {
      logs = logs.filter(l => l.errorType === filter.errorType);
    }
    if (filter.recovered !== undefined) {
      logs = logs.filter(l => (l.result.recovered === filter.recovered));
    }
    return logs.slice(-(filter.limit || 50));
  }

  async resetRecoveryState(errorType) {
    if (errorType) {
      delete this.recoveryState[errorType];
    } else {
      this.recoveryState = {};
    }
    await this.saveRecoveryState();
  }

  async clearRecoveryLog() {
    this.recoveryLog = [];
    await AsyncStorage.removeItem(RECOVERY_LOG_KEY);
  }
}

export default new ErrorRecovery();
