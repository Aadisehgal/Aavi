import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/PriorityInbox.js
// Feature 45 — AI Priority Inbox: ranks messages by urgency and sender trust


import NotificationAI from './NotificationAI';
import TrustScore from './TrustScore';

const STORAGE_KEY = '@manu_ai_priority_inbox';
const MAX_ITEMS   = 200;

class PriorityInbox {
  constructor() {
    this.items    = [];    // Sorted by priority desc
    this.unread   = 0;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data  = JSON.parse(stored);
        this.items  = data.items  || [];
        this.unread = data.unread || 0;
      }
    } catch (e) { console.warn('[PriorityInbox] Init:', e); }
  }

  async _save() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        items:  this.items.slice(0, MAX_ITEMS),
        unread: this.unread,
      }));
    } catch (e) { console.warn('[PriorityInbox] Save:', e); }
  }

  /**
   * Ingest a notification and compute its priority score.
   * @returns {object} enriched inbox item
   */
  async ingest(notification) {
    const analysis = await NotificationAI.analyzeNotification(notification).catch(() => ({
      category: 'social', priority: 2, confidence: 0.3,
    }));

    const trustInfo = TrustScore.getTrustLabel(notification.sender || '');
    const trustBoost = trustInfo.label === 'TRUSTED' ? 2 : trustInfo.label === 'BLOCKED' ? -10 : 0;

    const priorityScore = analysis.priority + trustBoost + (analysis.confidence * 2);

    const item = {
      id:            String(Date.now()),
      notification,
      category:      analysis.category,
      priority:      analysis.priority,
      priorityScore,
      confidence:    analysis.confidence,
      trustLabel:    trustInfo.label,
      trustColor:    trustInfo.color,
      action:        analysis.action,
      reason:        analysis.reason,
      read:          false,
      ts:            new Date().toISOString(),
    };

    // Insert sorted by priorityScore desc
    const idx = this.items.findIndex(i => i.priorityScore < priorityScore);
    if (idx === -1) this.items.push(item);
    else            this.items.splice(idx, 0, item);

    this.unread++;
    await this._save();
    return item;
  }

  markRead(id) {
    const item = this.items.find(i => i.id === id);
    if (item && !item.read) { item.read = true; this.unread = Math.max(0, this.unread - 1); this._save(); }
  }

  markAllRead() {
    this.items.forEach(i => { i.read = true; });
    this.unread = 0;
    this._save();
  }

  remove(id) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx !== -1) {
      if (!this.items[idx].read) this.unread = Math.max(0, this.unread - 1);
      this.items.splice(idx, 1);
      this._save();
    }
  }

  getItems({ category, unreadOnly } = {}) {
    let list = this.items;
    if (category)   list = list.filter(i => i.category === category);
    if (unreadOnly) list = list.filter(i => !i.read);
    return list;
  }

  getStats() {
    const byCategory = {};
    for (const i of this.items) byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    return { total: this.items.length, unread: this.unread, byCategory };
  }
}

export default new PriorityInbox();
