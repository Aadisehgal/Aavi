import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/SelfRepairEngine.js
// Generated: 2026-06-24
// Feature 101: Self-Healing Code Repair — Crash detect, auto-restart, log

import { NativeModules, AppState, Platform } from 'react-native';

const { ManuNativeBridge } = NativeModules;

const CRASH_LOG_KEY = '@manu_ai/crash_logs';
const CRASH_COUNT_KEY = '@manu_ai/crash_count';
const LAST_CRASH_KEY = '@manu_ai/last_crash_time';
const REPAIR_ATTEMPTS_KEY = '@manu_ai/repair_attempts';
const MAX_CRASHES_BEFORE_REPAIR = 3;
const CRASH_WINDOW_MS = 60000; // 1 minute
const MAX_REPAIR_ATTEMPTS = 5;

class SelfRepairEngine {
  constructor() {
    this.crashLogs = [];
    this.isMonitoring = false;
    this.repairCallbacks = new Map();
    this.moduleHealthStatus = new Map();
    this.init();
  }

  async init() {
    await this.loadCrashLogs();
    this.startGlobalErrorHandler();
    this.startModuleHealthMonitor();
  }

  async loadCrashLogs() {
    try {
      const stored = await AsyncStorage.getItem(CRASH_LOG_KEY);
      this.crashLogs = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.crashLogs = [];
    }
  }

  async saveCrashLogs() {
    try {
      const trimmed = this.crashLogs.slice(-100);
      await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  startGlobalErrorHandler() {
    if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.handleCrash(error, isFatal, 'JS_GLOBAL');
        if (originalHandler) originalHandler(error, isFatal);
      });
    }

    // Unhandled promise rejection
    if (global.process && global.process.on) {
      global.process.on('unhandledRejection', (reason, promise) => {
        this.handleCrash(
          new Error(`Unhandled Promise: ${reason}`),
          false,
          'PROMISE_REJECTION'
        );
      });
    }
  }

  async handleCrash(error, isFatal, type = 'UNKNOWN') {
    const crashEntry = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      isFatal: !!isFatal,
      type,
      appState: AppState.currentState,
      platform: Platform.OS,
      version: Platform.Version,
    };

    this.crashLogs.push(crashEntry);
    await this.saveCrashLogs();
    await this.incrementCrashCounter();

    if (isFatal) {
      await this.triggerAutoRepair(crashEntry);
    }

    return crashEntry;
  }

  async incrementCrashCounter() {
    try {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(CRASH_COUNT_KEY);
      const lastCrash = await AsyncStorage.getItem(LAST_CRASH_KEY);
      let count = stored ? parseInt(stored, 10) : 0;

      if (lastCrash && now - parseInt(lastCrash, 10) > CRASH_WINDOW_MS) {
        count = 0;
      }

      count += 1;
      await AsyncStorage.setItem(CRASH_COUNT_KEY, count.toString());
      await AsyncStorage.setItem(LAST_CRASH_KEY, now.toString());

      if (count >= MAX_CRASHES_BEFORE_REPAIR) {
        await this.triggerSystemRepair();
      }
    } catch (e) {}
  }

  async triggerAutoRepair(crashEntry) {
    const attempts = await this.getRepairAttempts();
    if (attempts >= MAX_REPAIR_ATTEMPTS) {
      await this.logEvent('REPAIR_MAX_EXCEEDED', { crashEntry });
      return false;
    }

    await this.incrementRepairAttempts();
    await this.logEvent('AUTO_REPAIR_TRIGGERED', { crashEntry, attempt: attempts + 1 });

    // Clear potentially corrupted caches
    await this.clearVolatileCaches();

    // Reset module states
    await this.resetModuleStates();

    // Attempt graceful restart if native bridge available
    if (ManuNativeBridge && ManuNativeBridge.restartApp) {
      try {
        ManuNativeBridge.restartApp();
      } catch (e) {
        await this.logEvent('RESTART_FAILED', { error: e.message });
      }
    }

    return true;
  }

  async triggerSystemRepair() {
    await this.logEvent('SYSTEM_REPAIR_TRIGGERED', {});
    await AsyncStorage.setItem(CRASH_COUNT_KEY, '0');

    // Aggressive cleanup
    const keys = await AsyncStorage.getAllKeys();
    const volatileKeys = keys.filter(k =>
      k.startsWith('@manu_ai/temp_') ||
      k.startsWith('@manu_ai/cache_') ||
      k.startsWith('@manu_ai/session_')
    );
    if (volatileKeys.length > 0) {
      await AsyncStorage.multiRemove(volatileKeys);
    }

    // Reset all module health
    this.moduleHealthStatus.clear();
  }

  async clearVolatileCaches() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tempKeys = keys.filter(k => k.startsWith('@manu_ai/temp_'));
      if (tempKeys.length > 0) {
        await AsyncStorage.multiRemove(tempKeys);
      }
    } catch (e) {}
  }

  async resetModuleStates() {
    const moduleKeys = [
      '@manu_ai/module_state_',
      '@manu_ai/active_modules',
    ];
    for (const key of moduleKeys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {}
    }
  }

  async getRepairAttempts() {
    try {
      const val = await AsyncStorage.getItem(REPAIR_ATTEMPTS_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  async incrementRepairAttempts() {
    const current = await this.getRepairAttempts();
    await AsyncStorage.setItem(REPAIR_ATTEMPTS_KEY, (current + 1).toString());
  }

  async resetRepairAttempts() {
    await AsyncStorage.setItem(REPAIR_ATTEMPTS_KEY, '0');
  }

  startModuleHealthMonitor() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.healthInterval = setInterval(() => {
      this.checkModuleHealth();
    }, 30000); // Every 30 seconds
  }

  async checkModuleHealth() {
    for (const [moduleName, status] of this.moduleHealthStatus.entries()) {
      if (status.unhealthyCount >= 3) {
        await this.restartModule(moduleName);
      }
    }
  }

  async restartModule(moduleName) {
    await this.logEvent('MODULE_RESTART', { moduleName });
    const callback = this.repairCallbacks.get(moduleName);
    if (callback) {
      try {
        await callback();
        this.moduleHealthStatus.set(moduleName, { unhealthyCount: 0, lastCheck: Date.now() });
      } catch (e) {
        await this.logEvent('MODULE_RESTART_FAILED', { moduleName, error: e.message });
      }
    }
  }

  registerModule(moduleName, repairCallback) {
    this.repairCallbacks.set(moduleName, repairCallback);
    this.moduleHealthStatus.set(moduleName, { unhealthyCount: 0, lastCheck: Date.now() });
  }

  reportModuleHealth(moduleName, isHealthy) {
    const status = this.moduleHealthStatus.get(moduleName) || { unhealthyCount: 0, lastCheck: 0 };
    if (!isHealthy) {
      status.unhealthyCount += 1;
    } else {
      status.unhealthyCount = 0;
    }
    status.lastCheck = Date.now();
    this.moduleHealthStatus.set(moduleName, status);
  }

  async logEvent(eventType, data) {
    const entry = {
      eventType,
      timestamp: Date.now(),
      data,
    };
    this.crashLogs.push(entry);
    await this.saveCrashLogs();
  }

  getCrashLogs(limit = 50) {
    return this.crashLogs.slice(-limit);
  }

  async clearCrashLogs() {
    this.crashLogs = [];
    await AsyncStorage.removeItem(CRASH_LOG_KEY);
    await AsyncStorage.removeItem(CRASH_COUNT_KEY);
    await AsyncStorage.removeItem(LAST_CRASH_KEY);
    await this.resetRepairAttempts();
  }

  dispose() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
    this.isMonitoring = false;
  }
}

export default new SelfRepairEngine();
