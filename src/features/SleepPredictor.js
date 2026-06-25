import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Sleep Quality Predictor)
// File: src/features/SleepPredictor.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule, BatteryModule } = NativeModules;

const SLEEP_DATA_KEY = '@manu_ai_sleep_data';
const PREDICTION_KEY = '@manu_ai_sleep_predictions';

/**
 * SleepPredictor estimates sleep quality from phone usage patterns,
 * screen time, app usage late at night, and battery trends.
 */
class SleepPredictor {
  constructor() {
    this.sleepRecords = [];
    this.usageBaseline = null;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(SLEEP_DATA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.sleepRecords = parsed.records || [];
        this.usageBaseline = parsed.baseline || null;
      }
    } catch (e) {
      console.warn('[SleepPredictor] Init error:', e);
    }
  }

  /**
   * Record sleep session based on phone inactivity.
   */
  async recordSleepSession(startTime, endTime, qualityIndicators = {}) {
    const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60); // minutes
    const record = {
      id: `sleep_${Date.now()}`,
      startTime,
      endTime,
      durationMinutes: duration,
      date: startTime.split('T')[0],
      ...qualityIndicators,
      timestamp: new Date().toISOString(),
    };

    this.sleepRecords.push(record);
    if (this.sleepRecords.length > 90) this.sleepRecords.shift();
    await this._persistData();
  }

  /**
   * Predict tonights sleep quality based on today's patterns.
   */
  async predictTonight() {
    const todayUsage = await this._getTodayUsage();
    const recentSleep = this._getRecentSleep(7);

    if (recentSleep.length < 3) {
      return {
        predictedQuality: 'unknown',
        confidence: 0,
        factors: ['Not enough sleep history yet. Keep using the app for better predictions.'],
        recommendation: 'Try to maintain a consistent sleep schedule.',
      };
    }

    const avgDuration = recentSleep.reduce((sum, r) => sum + r.durationMinutes, 0) / recentSleep.length;
    const avgQuality = this._calculateAvgQuality(recentSleep);

    let qualityScore = avgQuality;
    const factors = [];

    // Factor 1: Late night screen usage
    if (todayUsage.lateNightMinutes > 60) {
      qualityScore -= 0.15;
      factors.push('High late-night screen usage detected.');
    } else if (todayUsage.lateNightMinutes > 30) {
      qualityScore -= 0.08;
      factors.push('Moderate late-night screen usage.');
    }

    // Factor 2: Total screen time
    if (todayUsage.totalMinutes > 480) {
      qualityScore -= 0.1;
      factors.push('Very high total screen time today.');
    } else if (todayUsage.totalMinutes > 360) {
      qualityScore -= 0.05;
      factors.push('High total screen time today.');
    }

    // Factor 3: Social media late at night
    if (todayUsage.lateNightSocialMinutes > 20) {
      qualityScore -= 0.1;
      factors.push('Social media usage close to bedtime.');
    }

    // Factor 4: Irregular schedule
    const scheduleVariance = this._calculateScheduleVariance(recentSleep);
    if (scheduleVariance > 60) {
      qualityScore -= 0.1;
      factors.push('Irregular sleep schedule detected.');
    }

    // Factor 5: Weekend adjustment
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend && scheduleVariance < 30) {
      qualityScore += 0.05;
      factors.push('Weekend with consistent schedule — good sign.');
    }

    qualityScore = Math.max(0, Math.min(1, qualityScore));

    let predictedQuality = 'poor';
    if (qualityScore >= 0.8) predictedQuality = 'excellent';
    else if (qualityScore >= 0.6) predictedQuality = 'good';
    else if (qualityScore >= 0.4) predictedQuality = 'fair';

    const recommendation = this._generateRecommendation(qualityScore, factors, todayUsage);

    const prediction = {
      predictedQuality,
      qualityScore,
      confidence: Math.min(recentSleep.length / 14, 1.0),
      factors: factors.length > 0 ? factors : ['Sleep patterns look normal.'],
      recommendation,
      date: new Date().toISOString().split('T')[0],
    };

    await this._savePrediction(prediction);
    return prediction;
  }

  /**
   * Get sleep trend over time.
   */
  async getSleepTrend(days = 14) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filtered = this.sleepRecords.filter(r => new Date(r.startTime) > cutoff);

    if (filtered.length === 0) return { trend: 'insufficient_data', avgDuration: 0, avgQuality: 0 };

    const avgDuration = filtered.reduce((sum, r) => sum + r.durationMinutes, 0) / filtered.length;
    const avgQuality = this._calculateAvgQuality(filtered);

    // Simple trend: compare first half vs second half
    const mid = Math.floor(filtered.length / 2);
    const firstHalf = filtered.slice(0, mid);
    const secondHalf = filtered.slice(mid);
    const firstQuality = this._calculateAvgQuality(firstHalf);
    const secondQuality = this._calculateAvgQuality(secondHalf);

    let trend = 'stable';
    if (secondQuality > firstQuality + 0.1) trend = 'improving';
    else if (secondQuality < firstQuality - 0.1) trend = 'declining';

    return { trend, avgDuration, avgQuality, records: filtered.length };
  }

  /**
   * Get bedtime recommendation based on learned patterns.
   */
  async getBedtimeRecommendation() {
    const recentSleep = this._getRecentSleep(14);
    if (recentSleep.length < 3) {
      return { recommendedBedtime: '22:00', reason: 'Default recommendation for healthy sleep.' };
    }

    const bedtimes = recentSleep.map(r => {
      const d = new Date(r.startTime);
      return d.getHours() * 60 + d.getMinutes();
    });
    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const hours = Math.floor(avgBedtime / 60);
    const minutes = Math.round(avgBedtime % 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return {
      recommendedBedtime: timeStr,
      reason: `Based on your average sleep start time over the last ${recentSleep.length} nights.`,
    };
  }

  // --- Private helpers ---

  async _getTodayUsage() {
    if (Platform.OS === 'android' && UsageStatsModule) {
      try {
        return await UsageStatsModule.getTodayUsageBreakdown();
      } catch (e) {
        return { totalMinutes: 0, lateNightMinutes: 0, lateNightSocialMinutes: 0 };
      }
    }
    return { totalMinutes: 0, lateNightMinutes: 0, lateNightSocialMinutes: 0 };
  }

  _getRecentSleep(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.sleepRecords.filter(r => new Date(r.startTime) > cutoff);
  }

  _calculateAvgQuality(records) {
    if (records.length === 0) return 0.5;
    // Estimate quality from duration: 7-9 hours = best
    let total = 0;
    for (const r of records) {
      const hours = r.durationMinutes / 60;
      if (hours >= 7 && hours <= 9) total += 1.0;
      else if (hours >= 6 && hours < 7) total += 0.8;
      else if (hours > 9 && hours <= 10) total += 0.7;
      else if (hours >= 5 && hours < 6) total += 0.5;
      else total += 0.3;
    }
    return total / records.length;
  }

  _calculateScheduleVariance(records) {
    if (records.length < 2) return 0;
    const bedtimes = records.map(r => {
      const d = new Date(r.startTime);
      return d.getHours() * 60 + d.getMinutes();
    });
    const mean = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const variance = bedtimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / bedtimes.length;
    return Math.sqrt(variance);
  }

  _generateRecommendation(score, factors, usage) {
    if (score >= 0.8) return 'Great sleep hygiene! Keep up your current routine.';
    if (usage.lateNightMinutes > 60) return 'Try reducing screen time 1 hour before bed for better sleep.';
    if (factors.some(f => f.includes('irregular'))) return 'Try going to bed at the same time every night, even on weekends.';
    if (score >= 0.5) return 'Your sleep quality is okay. Small improvements to your evening routine could help.';
    return 'Consider establishing a relaxing bedtime routine and limiting screen time in the evening.';
  }

  async _persistData() {
    try {
      await AsyncStorage.setItem(SLEEP_DATA_KEY, JSON.stringify({
        records: this.sleepRecords,
        baseline: this.usageBaseline,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[SleepPredictor] Persist error:', e);
    }
  }

  async _savePrediction(prediction) {
    try {
      const stored = await AsyncStorage.getItem(PREDICTION_KEY);
      const predictions = stored ? JSON.parse(stored) : [];
      predictions.push(prediction);
      if (predictions.length > 30) predictions.shift();
      await AsyncStorage.setItem(PREDICTION_KEY, JSON.stringify(predictions));
    } catch (e) {
      console.warn('[SleepPredictor] Prediction save error:', e);
    }
  }

  async reset() {
    this.sleepRecords = [];
    this.usageBaseline = null;
    await AsyncStorage.multiRemove([SLEEP_DATA_KEY, PREDICTION_KEY]);
  }
}

export default new SleepPredictor();
