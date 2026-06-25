import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/ConfidenceScorer.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuNLPBridge } = NativeModules;

const CONFIDENCE_KEY = '@manu_ai_confidence_threshold';
const HISTORY_KEY = '@manu_ai_intent_history';

class ConfidenceScorer {
  constructor() {
    this.threshold = 0.75;
    this.history = [];
    this.maxHistory = 100;
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const saved = await AsyncStorage.getItem(CONFIDENCE_KEY);
      if (saved !== null) {
        this.threshold = parseFloat(saved);
      }
      const hist = await AsyncStorage.getItem(HISTORY_KEY);
      if (hist !== null) {
        this.history = JSON.parse(hist);
      }
    } catch (e) {
      console.warn('ConfidenceScorer load error:', e);
    }
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem(CONFIDENCE_KEY, String(this.threshold));
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(this.history.slice(-this.maxHistory)));
    } catch (e) {
      console.warn('ConfidenceScorer save error:', e);
    }
  }

  /**
   * Score intent confidence based on keyword match, context, and historical accuracy
   */
  scoreIntent(userInput, detectedIntent, context = {}) {
    if (!userInput || !detectedIntent) {
      return { score: 0.0, intent: 'unknown', shouldAsk: true };
    }

    const inputLower = userInput.toLowerCase().trim();
    const tokens = inputLower.split(/\s+/);

    let keywordScore = 0;
    let contextScore = 0;
    let historyScore = 0;

    // Keyword match scoring
    const intentKeywords = this.getIntentKeywords(detectedIntent);
    let matchedKeywords = 0;
    intentKeywords.forEach(kw => {
      if (inputLower.includes(kw.toLowerCase())) {
        matchedKeywords++;
      }
    });
    keywordScore = intentKeywords.length > 0 ? matchedKeywords / intentKeywords.length : 0.5;

    // Context relevance scoring
    if (context.lastIntent && context.lastIntent === detectedIntent) {
      contextScore += 0.15;
    }
    if (context.currentApp && this.isIntentRelevantToApp(detectedIntent, context.currentApp)) {
      contextScore += 0.15;
    }
    if (context.timeOfDay && this.isIntentRelevantToTime(detectedIntent, context.timeOfDay)) {
      contextScore += 0.1;
    }

    // Historical accuracy scoring
    const relatedHistory = this.history.filter(
      h => h.intent === detectedIntent && h.userInput.length > 0
    );
    if (relatedHistory.length > 0) {
      const correctCount = relatedHistory.filter(h => h.wasCorrect).length;
      historyScore = correctCount / relatedHistory.length;
    } else {
      historyScore = 0.5;
    }

    // Input length penalty (very short inputs are ambiguous)
    let lengthPenalty = 1.0;
    if (tokens.length < 3) {
      lengthPenalty = 0.8;
    } else if (tokens.length > 15) {
      lengthPenalty = 0.9;
    }

    // Composite score
    const rawScore = (keywordScore * 0.4 + contextScore * 0.3 + historyScore * 0.3) * lengthPenalty;
    const score = Math.min(Math.max(rawScore, 0.0), 1.0);

    return {
      score: parseFloat(score.toFixed(3)),
      intent: detectedIntent,
      shouldAsk: score < this.threshold,
      breakdown: {
        keyword: parseFloat(keywordScore.toFixed(3)),
        context: parseFloat(contextScore.toFixed(3)),
        history: parseFloat(historyScore.toFixed(3)),
      },
    };
  }

  getIntentKeywords(intent) {
    const map = {
      call: ['call', 'phone', 'dial', 'ring', 'contact'],
      message: ['message', 'text', 'sms', 'send', 'whatsapp'],
      alarm: ['alarm', 'wake', 'remind', 'timer', 'alert'],
      navigate: ['navigate', 'directions', 'map', 'route', 'go to'],
      weather: ['weather', 'temperature', 'rain', 'forecast', 'sunny'],
      music: ['play', 'music', 'song', 'spotify', 'audio'],
      search: ['search', 'find', 'look up', 'google', 'what is'],
      schedule: ['schedule', 'meeting', 'calendar', 'appointment', 'event'],
      settings: ['settings', 'brightness', 'volume', 'wifi', 'bluetooth'],
      joke: ['joke', 'funny', 'laugh', 'humor', 'story'],
      news: ['news', 'headlines', 'update', 'current events'],
      translate: ['translate', 'meaning', 'language', 'say in'],
    };
    return map[intent] || [];
  }

  isIntentRelevantToApp(intent, app) {
    const appIntentMap = {
      'com.whatsapp': ['message', 'call'],
      'com.google.android.dialer': ['call'],
      'com.google.android.apps.maps': ['navigate'],
      'com.google.android.music': ['music'],
      'com.android.chrome': ['search', 'translate'],
      'com.google.android.calendar': ['schedule', 'alarm'],
    };
    const relevant = appIntentMap[app];
    return relevant ? relevant.includes(intent) : false;
  }

  isIntentRelevantToTime(intent, hour) {
    const timeMap = {
      alarm: hour >= 20 || hour <= 8,
      schedule: hour >= 8 && hour <= 18,
      music: hour >= 6 && hour <= 23,
      navigate: hour >= 6 && hour <= 22,
    };
    return timeMap[intent] || false;
  }

  async recordResult(userInput, intent, wasCorrect) {
    this.history.push({
      userInput,
      intent,
      wasCorrect,
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    await this.saveSettings();
  }

  setThreshold(value) {
    this.threshold = Math.min(Math.max(value, 0.1), 1.0);
    this.saveSettings();
  }

  getThreshold() {
    return this.threshold;
  }

  getStats() {
    const total = this.history.length;
    const correct = this.history.filter(h => h.wasCorrect).length;
    return {
      total,
      correct,
      accuracy: total > 0 ? parseFloat((correct / total).toFixed(3)) : 0,
      threshold: this.threshold,
    };
  }
}

export default new ConfidenceScorer();
