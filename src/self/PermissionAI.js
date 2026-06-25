import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/PermissionAI.js
// Generated: 2026-06-24
// Feature 103: Learning-Based Permission Optimization — User behavior se auto-permission

import { PermissionsAndroid, Platform } from 'react-native';

const PERMISSION_HISTORY_KEY = '@manu_ai/permission_history';
const PERMISSION_MODEL_KEY = '@manu_ai/permission_model';
const CONFIDENCE_THRESHOLD = 0.75;
const MIN_SAMPLES = 3;

class PermissionAI {
  constructor() {
    this.permissionHistory = {};
    this.behaviorModel = {};
    this.init();
  }

  async init() {
    await this.loadHistory();
    await this.loadModel();
  }

  async loadHistory() {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_HISTORY_KEY);
      this.permissionHistory = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.permissionHistory = {};
    }
  }

  async saveHistory() {
    try {
      await AsyncStorage.setItem(PERMISSION_HISTORY_KEY, JSON.stringify(this.permissionHistory));
    } catch (e) {}
  }

  async loadModel() {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_MODEL_KEY);
      this.behaviorModel = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.behaviorModel = {};
    }
  }

  async saveModel() {
    try {
      await AsyncStorage.setItem(PERMISSION_MODEL_KEY, JSON.stringify(this.behaviorModel));
    } catch (e) {}
  }

  async recordPermissionDecision(permission, granted, context = {}) {
    const entry = {
      timestamp: Date.now(),
      granted,
      context: {
        appState: context.appState || 'unknown',
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: new Date().getDay(),
        previousUsage: context.previousUsage || 0,
      },
    };

    if (!this.permissionHistory[permission]) {
      this.permissionHistory[permission] = [];
    }
    this.permissionHistory[permission].push(entry);

    // Keep last 50 entries per permission
    if (this.permissionHistory[permission].length > 50) {
      this.permissionHistory[permission] = this.permissionHistory[permission].slice(-50);
    }

    await this.saveHistory();
    await this.updateModel(permission);
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  async updateModel(permission) {
    const history = this.permissionHistory[permission] || [];
    if (history.length < MIN_SAMPLES) return;

    const grantedCount = history.filter(h => h.granted).length;
    const totalCount = history.length;
    const baseRate = grantedCount / totalCount;

    // Contextual analysis
    const timeOfDayStats = {};
    const dayOfWeekStats = {};

    history.forEach(entry => {
      const tod = entry.context.timeOfDay;
      const dow = entry.context.dayOfWeek;
      if (!timeOfDayStats[tod]) timeOfDayStats[tod] = { granted: 0, total: 0 };
      if (!dayOfWeekStats[dow]) dayOfWeekStats[dow] = { granted: 0, total: 0 };
      timeOfDayStats[tod].total += 1;
      dayOfWeekStats[dow].total += 1;
      if (entry.granted) {
        timeOfDayStats[tod].granted += 1;
        dayOfWeekStats[dow].granted += 1;
      }
    });

    // Calculate confidence for current context
    const currentTod = this.getTimeOfDay();
    const currentDow = new Date().getDay();
    const todRate = timeOfDayStats[currentTod] ?
      timeOfDayStats[currentTod].granted / timeOfDayStats[currentTod].total : baseRate;
    const dowRate = dayOfWeekStats[currentDow] ?
      dayOfWeekStats[currentDow].granted / dayOfWeekStats[currentDow].total : baseRate;

    const contextualRate = (todRate + dowRate + baseRate) / 3;
    const confidence = Math.min(totalCount / 20, 1.0); // Max confidence at 20 samples

    this.behaviorModel[permission] = {
      baseRate,
      contextualRate,
      confidence,
      timeOfDayStats,
      dayOfWeekStats,
      lastUpdated: Date.now(),
      totalSamples: totalCount,
    };

    await this.saveModel();
  }

  async predictPermissionDecision(permission, context = {}) {
    const model = this.behaviorModel[permission];
    if (!model || model.confidence < CONFIDENCE_THRESHOLD) {
      return { shouldAutoRequest: false, confidence: 0, reason: 'INSUFFICIENT_DATA' };
    }

    const currentTod = this.getTimeOfDay();
    const currentDow = new Date().getDay();
    const todRate = model.timeOfDayStats[currentTod] ?
      model.timeOfDayStats[currentTod].granted / model.timeOfDayStats[currentTod].total : model.baseRate;
    const dowRate = model.dayOfWeekStats[currentDow] ?
      model.dayOfWeekStats[currentDow].granted / model.dayOfWeekStats[currentDow].total : model.baseRate;

    const predictedRate = (todRate + dowRate + model.baseRate) / 3;

    if (predictedRate >= CONFIDENCE_THRESHOLD && model.confidence >= CONFIDENCE_THRESHOLD) {
      return {
        shouldAutoRequest: true,
        confidence: model.confidence,
        predictedRate,
        reason: 'HIGH_GRANT_PROBABILITY',
      };
    }

    return {
      shouldAutoRequest: false,
      confidence: model.confidence,
      predictedRate,
      reason: 'LOW_GRANT_PROBABILITY',
    };
  }

  async requestPermissionWithAI(permission, rationale, context = {}) {
    if (Platform.OS !== 'android') {
      return { granted: true, auto: false };
    }

    const prediction = await this.predictPermissionDecision(permission, context);

    if (prediction.shouldAutoRequest) {
      const result = await PermissionsAndroid.request(permission, {
        title: 'Permission Required',
        message: rationale,
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      await this.recordPermissionDecision(permission, granted, context);
      return { granted, auto: true, prediction };
    }

    return { granted: false, auto: false, prediction, reason: 'AI_DEFERRED' };
  }

  async getPermissionInsights(permission) {
    const history = this.permissionHistory[permission] || [];
    const model = this.behaviorModel[permission];

    if (history.length === 0) {
      return { status: 'NO_DATA', message: 'No permission history available' };
    }

    const grantedCount = history.filter(h => h.granted).length;
    const rate = (grantedCount / history.length * 100).toFixed(1);

    return {
      status: model ? 'MODELED' : 'LEARNING',
      totalRequests: history.length,
      grantRate: `${rate}%`,
      confidence: model ? (model.confidence * 100).toFixed(1) + '%' : 'N/A',
      recommendation: model && model.confidence >= CONFIDENCE_THRESHOLD
        ? 'AI can auto-optimize this permission'
        : 'Continue monitoring user behavior',
    };
  }

  async resetModel() {
    this.permissionHistory = {};
    this.behaviorModel = {};
    await AsyncStorage.removeItem(PERMISSION_HISTORY_KEY);
    await AsyncStorage.removeItem(PERMISSION_MODEL_KEY);
  }
}

export default new PermissionAI();
