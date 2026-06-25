import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/DataPredictor.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuNetworkModule } = NativeModules;

const DATA_USAGE_KEY = '@manu_ai_data_usage';
const DATA_PREDICTION_KEY = '@manu_ai_data_predictions';

class DataPredictor {
  constructor() {
    this.usageHistory = [];
    this.predictions = [];
    this.maxHistory = 200;
    this.monitoringInterval = null;
    this.loadData();
  }

  async loadData() {
    try {
      const h = await AsyncStorage.getItem(DATA_USAGE_KEY);
      if (h) this.usageHistory = JSON.parse(h);
      const p = await AsyncStorage.getItem(DATA_PREDICTION_KEY);
      if (p) this.predictions = JSON.parse(p);
    } catch (e) {
      console.warn('DataPredictor load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(DATA_USAGE_KEY, JSON.stringify(this.usageHistory.slice(-this.maxHistory)));
      await AsyncStorage.setItem(DATA_PREDICTION_KEY, JSON.stringify(this.predictions.slice(-30)));
    } catch (e) {
      console.warn('DataPredictor save error:', e);
    }
  }

  async getCurrentDataUsage() {
    try {
      if (ManuNetworkModule) {
        return await ManuNetworkModule.getDataUsageStats();
      }
    } catch (e) {}
    return { mobileRx: 0, mobileTx: 0, wifiRx: 0, wifiTx: 0 };
  }

  async recordUsage() {
    const stats = await this.getCurrentDataUsage();
    const sample = {
      timestamp: Date.now(),
      mobileTotal: stats.mobileRx + stats.mobileTx,
      wifiTotal: stats.wifiRx + stats.wifiTx,
      appBreakdown: stats.appBreakdown || {},
    };

    // Calculate incremental usage since last sample
    if (this.usageHistory.length > 0) {
      const last = this.usageHistory[this.usageHistory.length - 1];
      sample.mobileDelta = Math.max(0, sample.mobileTotal - last.mobileTotal);
      sample.wifiDelta = Math.max(0, sample.wifiTotal - last.wifiTotal);
    } else {
      sample.mobileDelta = 0;
      sample.wifiDelta = 0;
    }

    this.usageHistory.push(sample);
    if (this.usageHistory.length > this.maxHistory) {
      this.usageHistory.shift();
    }
    await this.saveData();
    return sample;
  }

  startMonitoring(intervalMs = 300000) {
    if (this.monitoringInterval) return;
    this.recordUsage();
    this.monitoringInterval = setInterval(() => {
      this.recordUsage();
      this.generatePrediction();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  generatePrediction() {
    if (this.usageHistory.length < 7) return null;

    const dailyUsage = this.aggregateByDay();
    const days = Object.keys(dailyUsage).sort();
    if (days.length < 3) return null;

    // Simple moving average for prediction
    const recentDays = days.slice(-7);
    const mobileValues = recentDays.map(d => dailyUsage[d].mobile);
    const avgMobile = mobileValues.reduce((a, b) => a + b, 0) / mobileValues.length;

    // Trend detection
    const firstHalf = mobileValues.slice(0, Math.floor(mobileValues.length / 2));
    const secondHalf = mobileValues.slice(Math.floor(mobileValues.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';

    // Predict remaining month usage
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const remainingDays = daysInMonth - dayOfMonth;
    const predictedRemaining = avgMobile * remainingDays;
    const monthTotalSoFar = Object.values(dailyUsage).reduce((sum, d) => sum + d.mobile, 0);
    const predictedMonthTotal = monthTotalSoFar + predictedRemaining;

    const prediction = {
      timestamp: Date.now(),
      averageDailyMB: parseFloat((avgMobile / (1024 * 1024)).toFixed(2)),
      trend,
      predictedMonthTotalMB: parseFloat((predictedMonthTotal / (1024 * 1024)).toFixed(2)),
      daysRemaining: remainingDays,
      topConsumers: this.getTopConsumers(),
      wifiSuggestion: this.shouldSuggestWifi(avgMobile),
    };

    this.predictions.push(prediction);
    if (this.predictions.length > 30) this.predictions.shift();
    this.saveData();
    return prediction;
  }

  aggregateByDay() {
    const daily = {};
    for (const sample of this.usageHistory) {
      const day = new Date(sample.timestamp).toISOString().split('T')[0];
      if (!daily[day]) daily[day] = { mobile: 0, wifi: 0 };
      daily[day].mobile += sample.mobileDelta || 0;
      daily[day].wifi += sample.wifiDelta || 0;
    }
    return daily;
  }

  getTopConsumers() {
    if (this.usageHistory.length === 0) return [];
    const last = this.usageHistory[this.usageHistory.length - 1];
    const apps = last.appBreakdown || {};
    return Object.entries(apps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([app, bytes]) => ({
        app,
        usageMB: parseFloat((bytes / (1024 * 1024)).toFixed(2)),
      }));
  }

  shouldSuggestWifi(avgDailyBytes) {
    const avgMB = avgDailyBytes / (1024 * 1024);
    if (avgMB > 500) {
      return 'High mobile data usage. Connect to WiFi for large downloads and streaming.';
    }
    if (avgMB > 200) {
      return 'Moderate data usage. WiFi available for video calls and updates.';
    }
    return 'Data usage is efficient. No action needed.';
  }

  getLatestPrediction() {
    if (this.predictions.length === 0) return this.generatePrediction();
    return this.predictions[this.predictions.length - 1];
  }

  getDailyBreakdown(days = 7) {
    const daily = this.aggregateByDay();
    const sortedDays = Object.keys(daily).sort().slice(-days);
    return sortedDays.map(day => ({
      date: day,
      mobileMB: parseFloat((daily[day].mobile / (1024 * 1024)).toFixed(2)),
      wifiMB: parseFloat((daily[day].wifi / (1024 * 1024)).toFixed(2)),
    }));
  }

  shouldWarnHighUsage(dataLimitMB) {
    const pred = this.getLatestPrediction();
    if (!pred || !dataLimitMB) return false;
    return pred.predictedMonthTotalMB > dataLimitMB * 0.9;
  }
}

export default new DataPredictor();
