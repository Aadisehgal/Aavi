import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/LeakDetector.js
// Generated: 2026-06-24
// Feature 107: Memory Leak Detector — RAM leak find, auto-restart module

import { NativeModules, AppState } from 'react-native';

const LEAK_LOGS_KEY = '@manu_ai/leak_logs';
const MEMORY_SAMPLES_KEY = '@manu_ai/memory_samples';
const MAX_SAMPLES = 100;
const LEAK_THRESHOLD_MB = 50; // 50MB growth over window
const LEAK_WINDOW_MS = 300000; // 5 minutes
const CHECK_INTERVAL_MS = 30000; // 30 seconds

class LeakDetector {
  constructor() {
    this.memorySamples = [];
    this.leakLogs = [];
    this.isMonitoring = false;
    this.checkInterval = null;
    this.registeredModules = new Map();
    this.init();
  }

  async init() {
    await this.loadSamples();
    await this.loadLeakLogs();
  }

  async loadSamples() {
    try {
      const stored = await AsyncStorage.getItem(MEMORY_SAMPLES_KEY);
      this.memorySamples = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.memorySamples = [];
    }
  }

  async saveSamples() {
    try {
      const trimmed = this.memorySamples.slice(-MAX_SAMPLES);
      await AsyncStorage.setItem(MEMORY_SAMPLES_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  async loadLeakLogs() {
    try {
      const stored = await AsyncStorage.getItem(LEAK_LOGS_KEY);
      this.leakLogs = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.leakLogs = [];
    }
  }

  async saveLeakLogs() {
    try {
      const trimmed = this.leakLogs.slice(-100);
      await AsyncStorage.setItem(LEAK_LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.checkInterval = setInterval(() => {
      this.collectMemorySample();
      this.detectLeaks();
    }, CHECK_INTERVAL_MS);

    // Collect initial sample
    this.collectMemorySample();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async collectMemorySample() {
    let memoryInfo = { used: 0, total: 0, timestamp: Date.now() };

    try {
      if (NativeModules.ManuNativeBridge && NativeModules.ManuNativeBridge.getMemoryInfo) {
        const nativeInfo = await NativeModules.ManuNativeBridge.getMemoryInfo();
        memoryInfo = { ...nativeInfo, timestamp: Date.now() };
      } else {
        // Fallback using JS heap
        if (global.performance && global.performance.memory) {
          const perf = global.performance.memory;
          memoryInfo = {
            used: perf.usedJSHeapSize / (1024 * 1024),
            total: perf.totalJSHeapSize / (1024 * 1024),
            timestamp: Date.now(),
          };
        }
      }
    } catch (e) {
      memoryInfo = { used: 0, total: 0, timestamp: Date.now(), error: true };
    }

    this.memorySamples.push(memoryInfo);
    await this.saveSamples();
  }

  async detectLeaks() {
    if (this.memorySamples.length < 5) return;

    const now = Date.now();
    const windowStart = now - LEAK_WINDOW_MS;
    const windowSamples = this.memorySamples.filter(s => s.timestamp >= windowStart);

    if (windowSamples.length < 3) return;

    const first = windowSamples[0];
    const last = windowSamples[windowSamples.length - 1];
    const growth = last.used - first.used;

    if (growth > LEAK_THRESHOLD_MB) {
      // Calculate growth rate
      const timeSpanHours = (last.timestamp - first.timestamp) / 3600000;
      const growthRate = timeSpanHours > 0 ? growth / timeSpanHours : 0;

      const leakEntry = {
        id: `leak_${Date.now()}`,
        timestamp: Date.now(),
        growthMb: growth,
        growthRateMbPerHour: growthRate,
        sampleCount: windowSamples.length,
        startMemory: first.used,
        endMemory: last.used,
        appState: AppState.currentState,
        severity: growth > 100 ? 'CRITICAL' : growth > 50 ? 'HIGH' : 'MEDIUM',
      };

      this.leakLogs.push(leakEntry);
      await this.saveLeakLogs();

      // Trigger auto-restart for critical leaks
      if (leakEntry.severity === 'CRITICAL') {
        await this.handleCriticalLeak(leakEntry);
      }
    }
  }

  async handleCriticalLeak(leakEntry) {
    await this.logEvent('CRITICAL_LEAK_DETECTED', leakEntry);

    // Attempt module restarts first
    for (const [moduleName, restartFn] of this.registeredModules.entries()) {
      try {
        await restartFn();
        await this.logEvent('MODULE_RESTARTED_FOR_LEAK', { moduleName, leakId: leakEntry.id });
      } catch (e) {
        await this.logEvent('MODULE_RESTART_FAILED', { moduleName, error: e.message });
      }
    }

    // Clear caches
    await this.clearInternalCaches();
  }

  async clearInternalCaches() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k =>
        k.startsWith('@manu_ai/cache_') || k.startsWith('@manu_ai/temp_')
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (e) {}
  }

  async logEvent(eventType, data) {
    const entry = {
      eventType,
      timestamp: Date.now(),
      data,
    };
    this.leakLogs.push(entry);
    await this.saveLeakLogs();
  }

  registerModule(moduleName, restartCallback) {
    this.registeredModules.set(moduleName, restartCallback);
  }

  unregisterModule(moduleName) {
    this.registeredModules.delete(moduleName);
  }

  getMemoryTrend() {
    if (this.memorySamples.length < 2) return null;

    const samples = this.memorySamples.slice(-20);
    const trend = [];
    for (let i = 1; i < samples.length; i++) {
      trend.push({
        time: samples[i].timestamp,
        growth: samples[i].used - samples[i - 1].used,
      });
    }

    const avgGrowth = trend.reduce((sum, t) => sum + t.growth, 0) / trend.length;
    return {
      averageGrowthMb: avgGrowth,
      trend,
      isGrowing: avgGrowth > 0,
      totalSamples: this.memorySamples.length,
    };
  }

  async getLeakLogs(limit = 50) {
    return this.leakLogs.slice(-limit);
  }

  async getMemorySamples(limit = 50) {
    return this.memorySamples.slice(-limit);
  }

  async clearAllData() {
    this.memorySamples = [];
    this.leakLogs = [];
    await AsyncStorage.removeItem(MEMORY_SAMPLES_KEY);
    await AsyncStorage.removeItem(LEAK_LOGS_KEY);
  }

  dispose() {
    this.stopMonitoring();
  }
}

export default new LeakDetector();
