import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Predictive Intent Engine)
// File: src/features/PredictiveEngine.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { CalendarModule, UsageStatsModule } = NativeModules;

const STORAGE_KEY = '@manu_ai_predictive_engine';
const PATTERN_KEY = '@manu_ai_usage_patterns';

/**
 * PredictiveEngine analyzes calendar events and app usage history
 * to proactively suggest next actions before the user asks.
 */
class PredictiveEngine {
  constructor() {
    this.intentPatterns = new Map();
    this.timeSlotPatterns = new Map();
    this.confidenceThreshold = 0.65;
    this.maxHistoryItems = 200;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(PATTERN_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.intentPatterns = new Map(parsed.intentPatterns || []);
        this.timeSlotPatterns = new Map(parsed.timeSlotPatterns || []);
      }
    } catch (e) {
      console.warn('[PredictiveEngine] Init error:', e);
    }
  }

  async predictIntents() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const currentSlot = this._getTimeSlot(hour);
    const predictions = [];

    const calendarEvents = await this._getCalendarEvents();
    for (const event of calendarEvents) {
      const eventTime = new Date(event.startDate);
      const diffMinutes = (eventTime - now) / (1000 * 60);
      if (diffMinutes > 0 && diffMinutes <= 30) {
        predictions.push({
          type: 'calendar',
          intent: `Prepare for: ${event.title}`,
          confidence: this._calculateCalendarConfidence(diffMinutes, event),
          action: this._suggestActionForEvent(event),
          metadata: event,
        });
      }
    }

    const slotKey = `${dayOfWeek}_${currentSlot}`;
    const slotPatterns = this.timeSlotPatterns.get(slotKey) || [];
    const topPatterns = this._getTopPatterns(slotPatterns, 3);
    for (const pattern of topPatterns) {
      predictions.push({
        type: 'pattern',
        intent: `Likely action: ${pattern.action}`,
        confidence: pattern.frequency / (slotPatterns.length || 1),
        action: pattern.action,
        metadata: { slotKey, historyCount: pattern.frequency },
      });
    }

    const recentApps = await this._getRecentAppUsage(5);
    const sequencePrediction = this._predictFromSequence(recentApps);
    if (sequencePrediction) {
      predictions.push({
        type: 'sequence',
        intent: `Next app: ${sequencePrediction.appName}`,
        confidence: sequencePrediction.confidence,
        action: `Launch ${sequencePrediction.appName}`,
        metadata: sequencePrediction,
      });
    }

    return predictions
      .filter(p => p.confidence >= this.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  async recordAction(action, context = {}) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const slotKey = `${dayOfWeek}_${this._getTimeSlot(hour)}`;
    const existing = this.timeSlotPatterns.get(slotKey) || [];
    const existingIndex = existing.findIndex(p => p.action === action);
    if (existingIndex >= 0) {
      existing[existingIndex].frequency += 1;
      existing[existingIndex].lastSeen = now.toISOString();
    } else {
      existing.push({
        action,
        frequency: 1,
        firstSeen: now.toISOString(),
        lastSeen: now.toISOString(),
      });
    }
    existing.sort((a, b) => b.frequency - a.frequency);
    this.timeSlotPatterns.set(slotKey, existing.slice(0, 10));
    const intentKey = `${context.type || 'general'}_${action}`;
    const currentCount = this.intentPatterns.get(intentKey) || 0;
    this.intentPatterns.set(intentKey, currentCount + 1);
    await this._persistPatterns();
  }

  async getProactiveSuggestions() {
    const predictions = await this.predictIntents();
    return predictions.map(pred => ({
      priority: pred.confidence > 0.8 ? 'high' : 'medium',
      message: pred.intent,
      action: pred.action,
      autoTrigger: pred.confidence > 0.8,
    }));
  }

  _getTimeSlot(hour) {
    if (hour >= 5 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'late_morning';
    if (hour >= 12 && hour < 14) return 'afternoon';
    if (hour >= 14 && hour < 17) return 'late_afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  async _getCalendarEvents() {
    if (Platform.OS === 'android' && CalendarModule) {
      try { return await CalendarModule.getEventsForToday(); } catch (e) { return []; }
    }
    return [];
  }

  async _getRecentAppUsage(limit = 5) {
    if (Platform.OS === 'android' && UsageStatsModule) {
      try { return await UsageStatsModule.getRecentApps(limit); } catch (e) { return []; }
    }
    return [];
  }

  _calculateCalendarConfidence(diffMinutes, event) {
    let confidence = 0.9;
    if (diffMinutes > 15) confidence -= 0.1;
    if (diffMinutes > 25) confidence -= 0.15;
    if (event.important) confidence += 0.1;
    return Math.min(confidence, 1.0);
  }

  _suggestActionForEvent(event) {
    const title = (event.title || '').toLowerCase();
    if (title.includes('meet') || title.includes('call')) return 'Open meeting app';
    if (title.includes('class') || title.includes('study')) return 'Open study mode';
    if (title.includes('gym') || title.includes('workout')) return 'Open fitness tracker';
    if (title.includes('flight') || title.includes('travel')) return 'Open travel app';
    return 'Review event details';
  }

  _getTopPatterns(patterns, count) {
    return patterns.slice(0, count);
  }

  _predictFromSequence(recentApps) {
    if (!recentApps || recentApps.length < 2) return null;
    const lastApp = recentApps[0];
    const transitions = {};
    for (let i = 1; i < recentApps.length - 1; i++) {
      if (recentApps[i] === lastApp) {
        const nextApp = recentApps[i - 1];
        transitions[nextApp] = (transitions[nextApp] || 0) + 1;
      }
    }
    const entries = Object.entries(transitions);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return { appName: entries[0][0], confidence: entries[0][1] / total };
  }

  async _persistPatterns() {
    try {
      const data = {
        intentPatterns: Array.from(this.intentPatterns.entries()),
        timeSlotPatterns: Array.from(this.timeSlotPatterns.entries()),
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(PATTERN_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[PredictiveEngine] Persist error:', e);
    }
  }

  async reset() {
    this.intentPatterns.clear();
    this.timeSlotPatterns.clear();
    await AsyncStorage.removeItem(PATTERN_KEY);
  }
}

export default new PredictiveEngine();
