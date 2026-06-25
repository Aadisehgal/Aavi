import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/SubMonitor.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuSMSReader, ManuNotificationManager } = NativeModules;

const SUBS_KEY = '@manu_ai_subscriptions';
const ALERTS_KEY = '@manu_ai_sub_alerts';

class SubMonitor {
  constructor() {
    this.subscriptions = [];
    this.alerts = [];
    this.maxAlerts = 50;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(SUBS_KEY);
      if (s) this.subscriptions = JSON.parse(s);
      const a = await AsyncStorage.getItem(ALERTS_KEY);
      if (a) this.alerts = JSON.parse(a);
    } catch (e) {
      console.warn('SubMonitor load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(SUBS_KEY, JSON.stringify(this.subscriptions));
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(this.alerts.slice(-this.maxAlerts)));
    } catch (e) {
      console.warn('SubMonitor save error:', e);
    }
  }

  async scanForSubscriptions() {
    try {
      if (ManuSMSReader) {
        const messages = await ManuSMSReader.getFinancialMessages(90);
        for (const msg of messages) {
          const sub = this.parseSubscriptionSMS(msg.body, msg.timestamp);
          if (sub) {
            await this.addOrUpdateSubscription(sub);
          }
        }
      }
    } catch (e) {
      console.warn('Subscription scan failed:', e);
    }
  }

  parseSubscriptionSMS(body, timestamp) {
    if (!body) return null;
    const lower = body.toLowerCase();

    const subKeywords = ['subscription', 'renewed', 'recurring', 'auto-debit', 'membership', 'plan', 'monthly', 'yearly'];
    const isSub = subKeywords.some(kw => lower.includes(kw));
    if (!isSub) return null;

    const amountMatch = body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
                        body.match(/([\d,]+\.?\d*)\s*(?:Rs\.?|INR|₹)/i);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Extract service name
    const servicePatterns = [
      /(?:from|by|for|to)\s+([A-Za-z0-9\s&\.]+?)(?:\s+has|\s+was|\s+Rs|\s+on)/i,
      /([A-Za-z]+)\s+(?:subscription|plan|membership)/i,
    ];
    let service = 'Unknown Service';
    for (const pattern of servicePatterns) {
      const match = body.match(pattern);
      if (match) {
        service = match[1].trim().substring(0, 25);
        break;
      }
    }

    // Detect frequency
    let frequency = 'monthly';
    if (/yearly|annual|12 month/i.test(body)) frequency = 'yearly';
    else if (/weekly|7 days/i.test(body)) frequency = 'weekly';
    else if (/daily|24 hours/i.test(body)) frequency = 'daily';

    return {
      service,
      amount,
      frequency,
      lastDetected: timestamp,
      raw: body.substring(0, 150),
    };
  }

  async addOrUpdateSubscription(sub) {
    const existing = this.subscriptions.find(s =>
      s.service.toLowerCase() === sub.service.toLowerCase()
    );

    if (existing) {
      existing.lastDetected = sub.lastDetected;
      existing.amount = sub.amount;
      existing.frequency = sub.frequency;
      existing.detectedCount = (existing.detectedCount || 1) + 1;
    } else {
      this.subscriptions.push({
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        ...sub,
        detectedCount: 1,
        addedAt: Date.now(),
        userConfirmed: false,
        cancelUrl: null,
        notes: '',
      });
    }
    await this.saveData();
    await this.analyzeSubscriptions();
  }

  async analyzeSubscriptions() {
    const now = Date.now();
    for (const sub of this.subscriptions) {
      const daysSinceDetected = (now - sub.lastDetected) / (1000 * 60 * 60 * 24);

      // Flag unused subscriptions
      if (sub.detectedCount >= 3 && daysSinceDetected > 30 && !sub.userConfirmed) {
        await this.addAlert('unused', sub, `You may not be using ${sub.service}. Consider canceling.`);
      }

      // Price increase detection (simplified)
      // In production, compare with historical amounts
    }
  }

  async addAlert(type, subscription, message) {
    const alert = {
      id: `alert_${Date.now()}`,
      type,
      subscriptionId: subscription.id,
      service: subscription.service,
      message,
      timestamp: Date.now(),
      read: false,
    };
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) this.alerts.shift();
    await this.saveData();

    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title: '💳 Subscription Alert',
          body: message,
          channelId: 'subscription_alerts',
          priority: 'normal',
          data: { alertId: alert.id },
        });
      }
    } catch (e) {}
  }

  getMonthlyTotal() {
    let total = 0;
    for (const sub of this.subscriptions) {
      if (sub.frequency === 'monthly') total += sub.amount;
      else if (sub.frequency === 'yearly') total += sub.amount / 12;
      else if (sub.frequency === 'weekly') total += sub.amount * 4.33;
      else if (sub.frequency === 'daily') total += sub.amount * 30;
    }
    return parseFloat(total.toFixed(2));
  }

  getYearlyTotal() {
    return parseFloat((this.getMonthlyTotal() * 12).toFixed(2));
  }

  getSubscriptions(filter = {}) {
    let filtered = this.subscriptions;
    if (filter.unconfirmed) filtered = filtered.filter(s => !s.userConfirmed);
    return filtered.sort((a, b) => b.lastDetected - a.lastDetected);
  }

  async confirmSubscription(id) {
    const sub = this.subscriptions.find(s => s.id === id);
    if (sub) {
      sub.userConfirmed = true;
      await this.saveData();
    }
  }

  async deleteSubscription(id) {
    this.subscriptions = this.subscriptions.filter(s => s.id !== id);
    await this.saveData();
  }

  getAlerts(unreadOnly = false) {
    if (unreadOnly) return this.alerts.filter(a => !a.read);
    return this.alerts;
  }

  async markAlertRead(id) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.read = true;
      await this.saveData();
    }
  }

  suggestCancelReasons(sub) {
    const reasons = [];
    if (sub.detectedCount < 3) reasons.push('Recently started — evaluate if needed');
    if ((Date.now() - sub.lastDetected) > 60 * 24 * 60 * 60 * 1000) {
      reasons.push('No recent activity detected');
    }
    if (sub.amount > 1000) reasons.push('High cost — consider cheaper alternatives');
    return reasons;
  }
}

export default new SubMonitor();
