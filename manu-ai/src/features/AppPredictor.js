import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Predictive App Launcher)
// File: src/features/AppPredictor.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule } = NativeModules;

const APP_HISTORY_KEY = '@manu_ai_app_history';
const PREDICTION_KEY = '@manu_ai_app_predictions';

/**
 * AppPredictor learns from app usage sequences to predict
 * the next likely app and provide instant launch suggestions.
 */
class AppPredictor {
  constructor() {
    this.appHistory = [];
    this.transitionMatrix = new Map();
    this.timePatterns = new Map();
    this.confidenceThreshold = 0.4;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(APP_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.appHistory = parsed.history || [];
        this.transitionMatrix = new Map(parsed.transitions || []);
        this.timePatterns = new Map(parsed.timePatterns || []);
      }
    } catch (e) {
      console.warn('[AppPredictor] Init error:', e);
    }
  }

  /**
   * Record an app launch event.
   */
  async recordAppLaunch(packageName, appName = null) {
    const now = new Date();
    const entry = {
      packageName,
      appName: appName || packageName,
      timestamp: now.toISOString(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
    };

    // Update transition matrix
    if (this.appHistory.length > 0) {
      const lastApp = this.appHistory[this.appHistory.length - 1].packageName;
      const key = `${lastApp}→${packageName}`;
      const current = this.transitionMatrix.get(key) || 0;
      this.transitionMatrix.set(key, current + 1);
    }

    // Update time patterns
    const timeKey = `${now.getDay()}_${now.getHours()}`;
    const timeApps = this.timePatterns.get(timeKey) || [];
    timeApps.push({ packageName, timestamp: now.toISOString() });
    if (timeApps.length > 50) timeApps.shift();
    this.timePatterns.set(timeKey, timeApps);

    this.appHistory.push(entry);
    if (this.appHistory.length > 500) this.appHistory.shift();

    await this._persistData();
  }

  /**
   * Predict next likely apps based on current context.
   */
  async predictNextApps(currentPackage = null, limit = 5) {
    const now = new Date();
    const timeKey = `${now.getDay()}_${now.getHours()}`;
    const predictions = [];

    // 1. Transition-based prediction
    const lastApp = currentPackage || (this.appHistory.length > 0 ? this.appHistory[this.appHistory.length - 1].packageName : null);
    if (lastApp) {
      const transitions = [];
      for (const [key, count] of this.transitionMatrix.entries()) {
        if (key.startsWith(`${lastApp}→`)) {
          const target = key.split('→')[1];
          transitions.push({ packageName: target, count });
        }
      }

      const totalTransitions = transitions.reduce((sum, t) => sum + t.count, 0);
      transitions.sort((a, b) => b.count - a.count);

      for (const t of transitions.slice(0, limit)) {
        predictions.push({
          packageName: t.packageName,
          confidence: t.count / totalTransitions,
          source: 'transition',
        });
      }
    }

    // 2. Time-based prediction
    const timeApps = this.timePatterns.get(timeKey) || [];
    const timeCounts = {};
    for (const entry of timeApps) {
      timeCounts[entry.packageName] = (timeCounts[entry.packageName] || 0) + 1;
    }
    const timeEntries = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);
    const totalTime = timeEntries.reduce((sum, [, count]) => sum + count, 0);

    for (const [pkg, count] of timeEntries.slice(0, limit)) {
      const existing = predictions.find(p => p.packageName === pkg);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, count / totalTime);
        existing.sources = [...(existing.sources || [existing.source]), 'time'];
      } else {
        predictions.push({
          packageName: pkg,
          confidence: count / totalTime,
          source: 'time',
        });
      }
    }

    // 3. Frequency-based fallback
    if (predictions.length < limit) {
      const freqCounts = {};
      for (const entry of this.appHistory) {
        freqCounts[entry.packageName] = (freqCounts[entry.packageName] || 0) + 1;
      }
      const freqEntries = Object.entries(freqCounts).sort((a, b) => b[1] - a[1]);
      const totalFreq = this.appHistory.length;

      for (const [pkg, count] of freqEntries) {
        if (predictions.some(p => p.packageName === pkg)) continue;
        predictions.push({
          packageName: pkg,
          confidence: count / totalFreq,
          source: 'frequency',
        });
        if (predictions.length >= limit) break;
      }
    }

    return predictions
      .filter(p => p.confidence >= this.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
      .map(p => ({
        ...p,
        appName: this._getAppName(p.packageName),
      }));
  }

  /**
   * Get instant launch suggestion (top prediction).
   */
  async getInstantSuggestion() {
    const predictions = await this.predictNextApps(null, 1);
    if (predictions.length === 0) return null;
    return predictions[0];
  }

  /**
   * Get app usage statistics.
   */
  async getUsageStats(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filtered = this.appHistory.filter(h => new Date(h.timestamp) > cutoff);
    const counts = {};
    for (const entry of filtered) {
      counts[entry.packageName] = (counts[entry.packageName] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([pkg, count]) => ({ packageName: pkg, appName: this._getAppName(pkg), count }));
  }

  /**
   * Get frequently used app pairs (sequences).
   */
  async getCommonSequences(limit = 10) {
    const sequences = [];
    for (const [key, count] of this.transitionMatrix.entries()) {
      if (count >= 2) {
        const [from, to] = key.split('→');
        sequences.push({ from, to, count });
      }
    }
    return sequences.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  // --- Private helpers ---

  _getAppName(packageName) {
    const entry = this.appHistory.find(h => h.packageName === packageName);
    return entry?.appName || packageName;
  }

  async _persistData() {
    try {
      await AsyncStorage.setItem(APP_HISTORY_KEY, JSON.stringify({
        history: this.appHistory,
        transitions: Array.from(this.transitionMatrix.entries()),
        timePatterns: Array.from(this.timePatterns.entries()).map(([k, v]) => [k, v]),
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[AppPredictor] Persist error:', e);
    }
  }

  async reset() {
    this.appHistory = [];
    this.transitionMatrix.clear();
    this.timePatterns.clear();
    await AsyncStorage.removeItem(APP_HISTORY_KEY);
  }
}

export default new AppPredictor();
