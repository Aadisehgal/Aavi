// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/TrustScore.js
// Feature 44 — Dynamic contact trust scoring engine

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@manu_ai_trust_scores';

/**
 * TrustScore — builds a per-contact trust score (0-100) from interaction history.
 * Factors: call frequency, response rate, contact-book presence, spam signals.
 */
class TrustScore {
  constructor() {
    this.scores   = {};   // { [identifier]: { score, interactions, lastSeen, flags } }
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) this.scores = JSON.parse(stored);
    } catch (e) { console.warn('[TrustScore] Init:', e); }
  }

  async _save() {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores)); }
    catch (e) { console.warn('[TrustScore] Save:', e); }
  }

  _getOrCreate(id) {
    if (!this.scores[id]) {
      this.scores[id] = { score: 50, interactions: 0, responseCount: 0, lastSeen: null, flags: [] };
    }
    return this.scores[id];
  }

  /**
   * Record an interaction with a contact.
   * @param {string} id         — phone number or contact ID
   * @param {string} type       — 'call_in'|'call_out'|'sms_in'|'sms_out'|'replied'|'ignored'|'blocked'
   */
  recordInteraction(id, type) {
    const entry = this._getOrCreate(id);
    entry.interactions++;
    entry.lastSeen = new Date().toISOString();

    switch (type) {
      case 'call_out':  entry.score = Math.min(entry.score + 3, 100); break;  // You called them → trust
      case 'call_in':   entry.score = Math.min(entry.score + 1, 100); break;
      case 'sms_out':   entry.score = Math.min(entry.score + 2, 100); break;
      case 'replied':   entry.score = Math.min(entry.score + 4, 100); entry.responseCount++; break;
      case 'ignored':   entry.score = Math.max(entry.score - 2, 0);  break;
      case 'blocked':   entry.score = 0; entry.flags.push('BLOCKED'); break;
      case 'spam_flag': entry.score = Math.max(entry.score - 15, 0); entry.flags.push('SPAM'); break;
    }
    this._save();
    return entry.score;
  }

  getScore(id) {
    return this.scores[id]?.score ?? 50;
  }

  getTrustLabel(id) {
    const score = this.getScore(id);
    if (score >= 80) return { label: 'TRUSTED',    color: '#00e676' };
    if (score >= 55) return { label: 'FAMILIAR',   color: '#64dd17' };
    if (score >= 35) return { label: 'UNKNOWN',    color: '#ffea00' };
    if (score >= 15) return { label: 'SUSPICIOUS', color: '#ff6d00' };
    return              { label: 'BLOCKED',     color: '#ff1744' };
  }

  getAllScores() {
    return Object.entries(this.scores).map(([id, data]) => ({ id, ...data }));
  }

  reset(id) {
    delete this.scores[id];
    this._save();
  }
}

export default new TrustScore();
