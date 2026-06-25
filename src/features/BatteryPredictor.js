import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/BatteryPredictor.js
// Generated: 2026-06-24

import { NativeModules, AppState } from 'react-native';

const { ManuBatteryModule, ManuPowerManager } = NativeModules;

const BATTERY_HISTORY_KEY = '@manu_ai_battery_history';
const PREDICTION_KEY = '@manu_ai_battery_predictions';
const MAX_HISTORY = 200;

class BatteryPredictor {
  constructor() {
    this.history = [];
    this.predictions = [];
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.appState = AppState.currentState;
    this.loadData();
    this.setupAppStateListener();
  }

  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState;
      if (nextAppState === 'background') {
        this.startBackgroundSampling();
      } else {
        this.stopBackgroundSampling();
      }
    });
  }

  async loadData() {
    try {
      const hist = await AsyncStorage.getItem(BATTERY_HISTORY_KEY);
      if (hist) this.history = JSON.parse(hist);
      const pred = await AsyncStorage.getItem(PREDICTION_KEY);
      if (pred) this.predictions = JSON.parse(pred);
    } catch (e) {
      console.warn('BatteryPredictor load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(BATTERY_HISTORY_KEY, JSON.stringify(this.history.slice(-MAX_HISTORY)));
      await AsyncStorage.setItem(PREDICTION_KEY, JSON.stringify(this.predictions.slice(-50)));
    } catch (e) {
      console.warn('BatteryPredictor save error:', e);
    }
  }

  async getCurrentBatteryInfo() {
    try {
      if (ManuBatteryModule) {
        return await ManuBatteryModule.getBatteryInfo();
      }
      return { level: 100, isCharging: false, temperature: 30, voltage: 4200, health: 'GOOD' };
    } catch (e) {
      return { level: 100, isCharging: false, temperature: 30, voltage: 4200, health: 'GOOD' };
    }
  }

  async recordSample() {
    const info = await this.getCurrentBatteryInfo();
    const sample = {
      timestamp: Date.now(),
      level: info.level,
      isCharging: info.isCharging,
      temperature: info.temperature,
      voltage: info.voltage,
      appState: this.appState,
      screenOn: info.screenOn !== undefined ? info.screenOn : this.appState === 'active',
    };
    this.history.push(sample);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    await this.saveData();
    return sample;
  }

  startMonitoring(intervalMs = 300000) {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.recordSample();
    this.monitorInterval = setInterval(() => {
      this.recordSample();
      this.generatePrediction();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  startBackgroundSampling() {
    // In background, sample less frequently
    this.stopMonitoring();
    this.startMonitoring(600000);
  }

  stopBackgroundSampling() {
    this.stopMonitoring();
    this.startMonitoring(300000);
  }

  generatePrediction() {
    if (this.history.length < 5) return null;

    const recent = this.history.slice(-20);
    const dischargingSamples = recent.filter(s => !s.isCharging);

    if (dischargingSamples.length < 3) {
      return { timeToEmpty: null, timeToFull: this.estimateTimeToFull(recent), confidence: 0 };
    }

    // Calculate drain rate (% per hour)
    const first = dischargingSamples[0];
    const last = dischargingSamples[dischargingSamples.length - 1];
    const timeDiffHours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    const levelDiff = first.level - last.level;

    if (timeDiffHours <= 0 || levelDiff <= 0) return null;

    const drainRate = levelDiff / timeDiffHours; // % per hour
    const timeToEmpty = last.level / drainRate; // hours

    // Adjust based on usage patterns
    const adjustedTime = this.applyUsagePatternAdjustment(timeToEmpty, recent);

    const prediction = {
      timestamp: Date.now(),
      currentLevel: last.level,
      drainRate: parseFloat(drainRate.toFixed(2)),
      estimatedTimeToEmptyMinutes: Math.round(adjustedTime * 60),
      estimatedTimeToFullMinutes: this.estimateTimeToFull(recent),
      confidence: this.calculateConfidence(dischargingSamples.length, drainRate),
      recommendation: this.getRecommendation(last.level, adjustedTime, drainRate),
    };

    this.predictions.push(prediction);
    if (this.predictions.length > 50) this.predictions.shift();
    this.saveData();
    return prediction;
  }

  estimateTimeToFull(samples) {
    const charging = samples.filter(s => s.isCharging);
    if (charging.length < 2) return null;
    const last = charging[charging.length - 1];
    // Assume ~1.5% per minute for fast charge, ~0.8% for normal
    const rate = last.level > 80 ? 0.8 : 1.5;
    return Math.round((100 - last.level) / rate);
  }

  applyUsagePatternAdjustment(baseHours, samples) {
    const hour = new Date().getHours();
    let multiplier = 1.0;

    // Higher usage during commute hours (8-10 AM, 5-7 PM)
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
      multiplier *= 0.85;
    }
    // Lower usage late night
    if (hour >= 23 || hour <= 6) {
      multiplier *= 1.2;
    }
    // Screen on ratio adjustment
    const screenOnRatio = samples.filter(s => s.screenOn).length / samples.length;
    if (screenOnRatio > 0.7) {
      multiplier *= 0.9;
    }

    return baseHours * multiplier;
  }

  calculateConfidence(sampleCount, drainRate) {
    let conf = Math.min(sampleCount / 10, 1.0);
    if (drainRate < 1) conf *= 0.7; // Very low drain = less reliable
    return parseFloat(conf.toFixed(2));
  }

  getRecommendation(level, timeToEmpty, drainRate) {
    if (level <= 15) {
      return 'CRITICAL: Enable ultra power saver immediately. Close all non-essential apps.';
    }
    if (level <= 30 && timeToEmpty < 2) {
      return 'WARNING: Battery low with heavy usage. Enable battery saver or charge soon.';
    }
    if (drainRate > 15) {
      return 'High drain detected. Check for background apps consuming excessive power.';
    }
    if (timeToEmpty > 8 && level > 50) {
      return 'Battery healthy. No action needed.';
    }
    if (level <= 20) {
      return 'Low battery. Consider charging or enabling power saver.';
    }
    return 'Battery status normal.';
  }

  async getLatestPrediction() {
    if (this.predictions.length === 0) {
      return this.generatePrediction();
    }
    return this.predictions[this.predictions.length - 1];
  }

  getHistory() {
    return this.history;
  }

  getAverageDrainRate(hours = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const samples = this.history.filter(s => s.timestamp > cutoff && !s.isCharging);
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const diffHours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    return diffHours > 0 ? parseFloat(((first.level - last.level) / diffHours).toFixed(2)) : 0;
  }

  shouldTriggerSaver() {
    const pred = this.getLatestPrediction();
    if (!pred) return false;
    return pred.currentLevel <= 20 || (pred.currentLevel <= 30 && pred.estimatedTimeToEmptyMinutes < 60);
  }

  async triggerPowerSaver() {
    try {
      if (ManuPowerManager) {
        await ManuPowerManager.enablePowerSaver();
      }
    } catch (e) {
      console.warn('Failed to trigger power saver:', e);
    }
  }
}

export default new BatteryPredictor();
