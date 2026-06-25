import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Notification Priority AI)
// File: src/features/NotificationAI.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { NotificationListenerModule } = NativeModules;

const STORAGE_KEY = '@manu_ai_notification_ai';
const LEARNED_PATTERNS_KEY = '@manu_ai_notification_patterns';

class NotificationAI {
  constructor() {
    this.categoryRules = this._getDefaultRules();
    this.learnedPatterns = new Map();
    this.senderHistory = new Map();
    this.categoryStats = { urgent: 0, family: 0, work: 0, social: 0, junk: 0, promotional: 0 };
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(LEARNED_PATTERNS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.learnedPatterns = new Map(parsed.patterns || []);
        this.senderHistory = new Map(parsed.senders || []);
        this.categoryStats = parsed.stats || this.categoryStats;
      }
    } catch (e) {
      console.warn('[NotificationAI] Init error:', e);
    }
  }

  async analyzeNotification(notification) {
    const { title, text, packageName, sender, timestamp } = notification;
    const combinedText = `${title || ''} ${text || ''}`.toLowerCase();
    let scores = { urgent: 0, family: 0, work: 0, social: 0, junk: 0, promotional: 0 };

    for (const [category, rules] of Object.entries(this.categoryRules)) {
      for (const keyword of rules.keywords) {
        if (combinedText.includes(keyword.toLowerCase())) scores[category] += rules.weight;
      }
      for (const pattern of rules.patterns) {
        if (pattern.test(combinedText)) scores[category] += rules.weight * 1.5;
      }
    }

    const senderLower = (sender || '').toLowerCase();
    const senderHistory = this.senderHistory.get(senderLower);
    if (senderHistory) scores[senderHistory.category] += 2.0;

    const pkgLower = (packageName || '').toLowerCase();
    if (pkgLower.includes('whatsapp') || pkgLower.includes('sms')) scores.social += 0.5;
    if (pkgLower.includes('email') || pkgLower.includes('outlook') || pkgLower.includes('gmail')) scores.work += 0.5;
    if (pkgLower.includes('bank') || pkgLower.includes('pay')) scores.urgent += 1.0;

    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) scores.urgent += 1.5;

    if (text && text.length > 300 && /\d{4,}/.test(text)) scores.promotional += 1.0;

    let maxScore = -1;
    let winningCategory = 'social';
    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) { maxScore = score; winningCategory = cat; }
    }

    const confidence = Math.min(maxScore / 5, 1.0);
    const result = {
      category: winningCategory,
      priority: this._categoryToPriority(winningCategory),
      confidence,
      action: this._suggestAction(winningCategory, notification),
      reason: this._generateReason(winningCategory, scores),
      rawScores: scores,
      timestamp: timestamp || new Date().toISOString(),
    };
    await this._recordNotification(senderLower, winningCategory);
    return result;
  }

  async analyzeBatch(notifications) {
    const results = [];
    for (const notif of notifications) {
      results.push(await this.analyzeNotification(notif));
    }
    return results;
  }

  async getCategorySummary(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return this.categoryStats;
      const history = JSON.parse(stored);
      const filtered = history.filter(h => new Date(h.timestamp).getTime() > cutoff);
      const summary = { urgent: 0, family: 0, work: 0, social: 0, junk: 0, promotional: 0 };
      for (const item of filtered) {
        if (summary[item.category] !== undefined) summary[item.category]++;
      }
      return summary;
    } catch (e) { return this.categoryStats; }
  }

  async learnCorrection(notification, correctCategory) {
    const senderLower = (notification.sender || '').toLowerCase();
    this.senderHistory.set(senderLower, {
      category: correctCategory,
      correctedAt: new Date().toISOString(),
      confidence: 1.0,
    });
    const textLower = (notification.text || '').toLowerCase();
    const words = textLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      const key = `${correctCategory}_${word}`;
      const current = this.learnedPatterns.get(key) || 0;
      this.learnedPatterns.set(key, current + 1);
    }
    await this._persistPatterns();
  }

  async getUrgentNotifications() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const history = JSON.parse(stored);
      return history.filter(h => h.category === 'urgent' || h.priority === 'high')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    } catch (e) { return []; }
  }

  async autoDismissJunk() {
    if (Platform.OS === 'android' && NotificationListenerModule) {
      try {
        const notifications = await NotificationListenerModule.getActiveNotifications();
        for (const notif of notifications) {
          const analysis = await this.analyzeNotification(notif);
          if ((analysis.category === 'junk' || analysis.category === 'promotional') && analysis.confidence > 0.8) {
            await NotificationListenerModule.dismissNotification(notif.key);
          }
        }
      } catch (e) {
        console.warn('[NotificationAI] Auto-dismiss error:', e);
      }
    }
  }

  _getDefaultRules() {
    return {
      urgent: {
        keywords: ['emergency', 'urgent', 'alert', 'critical', 'asap', 'immediately', 'now', 'hurry', 'accident', 'hospital', 'police', 'fire', 'danger', 'help'],
        patterns: [/\b(call me back|call me now|need you)\b/i, /\b(\d{3}-\d{3}-\d{4})\b/],
        weight: 2.0,
      },
      family: {
        keywords: ['mom', 'dad', 'mum', 'papa', 'maa', 'family', 'home', 'beta', 'bhai', 'behen', 'didi', 'brother', 'sister', 'grandma', 'grandpa'],
        patterns: [/\b(love you|miss you|come home)\b/i],
        weight: 1.5,
      },
      work: {
        keywords: ['meeting', 'deadline', 'project', 'report', 'client', 'boss', 'office', 'work', 'assignment', 'task', 'submission', 'interview', 'offer'],
        patterns: [/\b(scheduled at|join now|meeting link)\b/i, /\b(\d{1,2}:\d{2}\s*(am|pm)?)\b/i],
        weight: 1.5,
      },
      social: {
        keywords: ['party', 'weekend', 'plan', 'movie', 'lunch', 'dinner', 'coffee', 'hangout', 'game', 'match', 'birthday', 'wedding'],
        patterns: [/\b(are you free|wanna|let\'s)\b/i],
        weight: 1.0,
      },
      junk: {
        keywords: ['spam', 'scam', 'fraud', 'lottery', 'winner', 'prize', 'free', 'claim', 'verify', 'suspicious', 'blocked'],
        patterns: [/\$\d+/, /\b(click here|limited time|act now)\b/i, /http[s]?:\/\//i],
        weight: 2.5,
      },
      promotional: {
        keywords: ['sale', 'discount', 'offer', 'deal', 'coupon', 'cashback', 'buy', 'shop', 'order', 'delivery', 'new arrival', 'trending'],
        patterns: [/\b(\d+% off|save \$\d+)\b/i, /\b(flat|upto|minimum)\b/i],
        weight: 1.5,
      },
    };
  }

  _categoryToPriority(category) {
    switch (category) {
      case 'urgent': return 'high';
      case 'family': return 'high';
      case 'work': return 'medium';
      case 'social': return 'low';
      case 'junk': return 'none';
      case 'promotional': return 'low';
      default: return 'low';
    }
  }

  _suggestAction(category, notification) {
    switch (category) {
      case 'urgent': return 'Show immediately with sound';
      case 'family': return 'Show with gentle alert';
      case 'work': return 'Show in work banner';
      case 'social': return 'Show silently';
      case 'junk': return 'Auto-dismiss';
      case 'promotional': return 'Batch and show later';
      default: return 'Show normally';
    }
  }

  _generateReason(category, scores) {
    const topCategories = Object.entries(scores).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
    return `Detected as ${category} based on keywords and sender history. Top signals: ${topCategories.join(', ')}.`;
  }

  async _recordNotification(sender, category) {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const history = stored ? JSON.parse(stored) : [];
      history.push({ sender, category, timestamp: new Date().toISOString() });
      if (history.length > 500) history.shift();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) { console.warn('[NotificationAI] Record error:', e); }
  }

  async _persistPatterns() {
    try {
      await AsyncStorage.setItem(LEARNED_PATTERNS_KEY, JSON.stringify({
        patterns: Array.from(this.learnedPatterns.entries()),
        senders: Array.from(this.senderHistory.entries()),
        stats: this.categoryStats,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) { console.warn('[NotificationAI] Persist error:', e); }
  }

  async reset() {
    this.learnedPatterns.clear();
    this.senderHistory.clear();
    this.categoryStats = { urgent: 0, family: 0, work: 0, social: 0, junk: 0, promotional: 0 };
    await AsyncStorage.multiRemove([STORAGE_KEY, LEARNED_PATTERNS_KEY]);
  }
}

export default new NotificationAI();
