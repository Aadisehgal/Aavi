import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/DrainAnalyzer.js
// Generated: 2026-06-24
// Feature 108: Battery Drain Analyzer — App-wise drain, optimize suggest

import { NativeModules, AppState, Platform } from 'react-native';

const DRAIN_LOGS_KEY = '@manu_ai/drain_logs';
const BATTERY_SAMPLES_KEY = '@manu_ai/battery_samples';
const MAX_SAMPLES = 200;
const DRAIN_THRESHOLD_PER_HOUR = 15; // 15% per hour

class DrainAnalyzer {
  constructor() {
    this.batterySamples = [];
    this.drainLogs = [];
    this.isMonitoring = false;
    this.checkInterval = null;
    this.moduleDrainMap = new Map();
    this.init();
  }

  async init() {
    await this.loadSamples();
    await this.loadDrainLogs();
  }

  async loadSamples() {
    try {
      const stored = await AsyncStorage.getItem(BATTERY_SAMPLES_KEY);
      this.batterySamples = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.batterySamples = [];
    }
  }

  async saveSamples() {
    try {
      const trimmed = this.batterySamples.slice(-MAX_SAMPLES);
      await AsyncStorage.setItem(BATTERY_SAMPLES_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  async loadDrainLogs() {
    try {
      const stored = await AsyncStorage.getItem(DRAIN_LOGS_KEY);
      this.drainLogs = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.drainLogs = [];
    }
  }

  async saveDrainLogs() {
    try {
      const trimmed = this.drainLogs.slice(-100);
      await AsyncStorage.setItem(DRAIN_LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.checkInterval = setInterval(() => {
      this.collectBatterySample();
      this.analyzeDrain();
    }, 60000); // Every minute

    this.collectBatterySample();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async collectBatterySample() {
    let batteryInfo = {
      level: 100,
      isCharging: false,
      temperature: 0,
      voltage: 0,
      timestamp: Date.now(),
      appState: AppState.currentState,
    };

    try {
      if (NativeModules.ManuNativeBridge && NativeModules.ManuNativeBridge.getBatteryInfo) {
        const nativeInfo = await NativeModules.ManuNativeBridge.getBatteryInfo();
        batteryInfo = { ...nativeInfo, timestamp: Date.now(), appState: AppState.currentState };
      }
    } catch (e) {}

    this.batterySamples.push(batteryInfo);
    await this.saveSamples();
  }

  async analyzeDrain() {
    if (this.batterySamples.length < 10) return;

    const recent = this.batterySamples.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    // Skip if charging
    if (last.isCharging || first.isCharging) return;

    const timeDeltaHours = (last.timestamp - first.timestamp) / 3600000;
    if (timeDeltaHours < 0.1) return; // Need at least 6 minutes

    const drainRate = (first.level - last.level) / timeDeltaHours;

    if (drainRate > DRAIN_THRESHOLD_PER_HOUR) {
      const drainEntry = {
        id: `drain_${Date.now()}`,
        timestamp: Date.now(),
        drainRatePercentPerHour: drainRate,
        startLevel: first.level,
        endLevel: last.level,
        durationHours: timeDeltaHours,
        appState: AppState.currentState,
        severity: drainRate > 30 ? 'CRITICAL' : drainRate > 20 ? 'HIGH' : 'MEDIUM',
      };

      this.drainLogs.push(drainEntry);
      await this.saveDrainLogs();
      await this.generateOptimizationSuggestions(drainEntry);
    }
  }

  async generateOptimizationSuggestions(drainEntry) {
    const suggestions = [];

    // Analyze by app state
    if (drainEntry.appState === 'background') {
      suggestions.push({
        type: 'BACKGROUND_DRAIN',
        priority: 'HIGH',
        message: 'High background drain detected. Consider reducing background tasks.',
        actions: ['Reduce sync frequency', 'Disable background location', 'Limit push notifications'],
      });
    }

    // Module-specific analysis
    for (const [moduleName, drainData] of this.moduleDrainMap.entries()) {
      if (drainData.impactScore > 0.3) {
        suggestions.push({
          type: 'MODULE_DRAIN',
          priority: 'MEDIUM',
          module: moduleName,
          message: `${moduleName} is contributing significantly to battery drain.`,
          actions: [`Reduce ${moduleName} polling frequency`, `Batch ${moduleName} operations`],
        });
      }
    }

    // Temperature-based suggestion
    const recentTemp = this.batterySamples.slice(-5);
    const avgTemp = recentTemp.reduce((sum, s) => sum + (s.temperature || 0), 0) / recentTemp.length;
    if (avgTemp > 400) { // 40°C in tenths
      suggestions.push({
        type: 'THERMAL',
        priority: 'HIGH',
        message: 'Device is running hot. Thermal throttling may increase drain.',
        actions: ['Close heavy apps', 'Reduce animation quality', 'Disable non-essential features'],
      });
    }

    const suggestionEntry = {
      id: `suggestion_${Date.now()}`,
      drainId: drainEntry.id,
      timestamp: Date.now(),
      suggestions,
    };

    try {
      const key = '@manu_ai/drain_suggestions';
      const stored = await AsyncStorage.getItem(key) || '[]';
      const parsed = JSON.parse(stored);
      parsed.push(suggestionEntry);
      await AsyncStorage.setItem(key, JSON.stringify(parsed.slice(-50)));
    } catch (e) {}
  }

  recordModuleActivity(moduleName, durationMs, powerImpact = 'medium') {
    const impactMap = { low: 0.1, medium: 0.3, high: 0.6, critical: 1.0 };
    const impactScore = (impactMap[powerImpact] || 0.3) * (durationMs / 1000 / 60); // per minute

    const existing = this.moduleDrainMap.get(moduleName) || {
      totalDuration: 0,
      totalImpact: 0,
      sampleCount: 0,
    };

    existing.totalDuration += durationMs;
    existing.totalImpact += impactScore;
    existing.sampleCount += 1;
    existing.impactScore = existing.totalImpact / existing.sampleCount;

    this.moduleDrainMap.set(moduleName, existing);
  }

  async getDrainAnalysis() {
    if (this.batterySamples.length < 2) {
      return { status: 'INSUFFICIENT_DATA', message: 'Collecting battery data...' };
    }

    const recent = this.batterySamples.slice(-50);
    const drainRates = [];
    for (let i = 1; i < recent.length; i++) {
      const timeDelta = (recent[i].timestamp - recent[i - 1].timestamp) / 3600000;
      if (timeDelta > 0 && !recent[i].isCharging && !recent[i - 1].isCharging) {
        drainRates.push((recent[i - 1].level - recent[i].level) / timeDelta);
      }
    }

    const avgDrain = drainRates.length > 0
      ? drainRates.reduce((sum, r) => sum + r, 0) / drainRates.length
      : 0;

    return {
      status: 'ANALYZED',
      averageDrainRate: avgDrain,
      currentLevel: recent[recent.length - 1]?.level || 100,
      isCharging: recent[recent.length - 1]?.isCharging || false,
      estimatedHoursRemaining: avgDrain > 0 ? (recent[recent.length - 1]?.level || 0) / avgDrain : null,
      severity: avgDrain > 30 ? 'CRITICAL' : avgDrain > 20 ? 'HIGH' : avgDrain > 10 ? 'MEDIUM' : 'LOW',
    };
  }

  async getSuggestions() {
    try {
      const stored = await AsyncStorage.getItem('@manu_ai/drain_suggestions');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  async getDrainLogs(limit = 50) {
    return this.drainLogs.slice(-limit);
  }

  async clearAllData() {
    this.batterySamples = [];
    this.drainLogs = [];
    this.moduleDrainMap.clear();
    await AsyncStorage.removeItem(BATTERY_SAMPLES_KEY);
    await AsyncStorage.removeItem(DRAIN_LOGS_KEY);
    await AsyncStorage.removeItem('@manu_ai/drain_suggestions');
  }

  dispose() {
    this.stopMonitoring();
  }
}

export default new DrainAnalyzer();
