import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/SmartClipboard.js
// Feature 47 — AI-powered clipboard manager with content intelligence

import { Clipboard} from 'react-native';

const STORAGE_KEY  = '@manu_ai_clipboard';
const MAX_HISTORY  = 50;

const CONTENT_TYPES = {
  URL:     /^https?:\/\/\S+/i,
  EMAIL:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE:   /^[+]?[\d\s\-().]{7,15}$/,
  OTP:     /^\d{4,8}$/,
  ADDRESS: /\d+\s+\w+.*(street|st|avenue|ave|road|rd|lane|ln|blvd)/i,
  JSON:    /^\s*[\[{]/,
};

class SmartClipboard {
  constructor() {
    this.history = [];
    this.pinned  = [];
    this._pollInterval = null;
    this._lastText     = '';
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data    = JSON.parse(stored);
        this.history  = data.history || [];
        this.pinned   = data.pinned  || [];
      }
    } catch (e) { console.warn('[SmartClipboard] Init:', e); }
  }

  async _save() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        history: this.history.slice(0, MAX_HISTORY),
        pinned:  this.pinned,
      }));
    } catch (e) { console.warn('[SmartClipboard] Save:', e); }
  }

  classifyContent(text) {
    for (const [type, pattern] of Object.entries(CONTENT_TYPES)) {
      if (pattern.test(text.trim())) return type;
    }
    if (text.length > 300) return 'DOCUMENT';
    if (/\n/.test(text))   return 'MULTILINE';
    return 'TEXT';
  }

  async addToHistory(text) {
    if (!text || text === this._lastText) return;
    this._lastText = text;

    const existing = this.history.findIndex(h => h.text === text);
    if (existing !== -1) {
      // Move to top
      const [item] = this.history.splice(existing, 1);
      item.count++;
      item.lastCopied = new Date().toISOString();
      this.history.unshift(item);
    } else {
      this.history.unshift({
        id:         String(Date.now()),
        text,
        type:       this.classifyContent(text),
        count:      1,
        lastCopied: new Date().toISOString(),
      });
      if (this.history.length > MAX_HISTORY) this.history.pop();
    }
    await this._save();
  }

  startPolling(interval = 1500) {
    if (this._pollInterval) return;
    this._pollInterval = setInterval(async () => {
      try {
        const text = await Clipboard.getString();
        if (text) this.addToHistory(text);
      } catch (e) {}
    }, interval);
  }

  stopPolling() {
    clearInterval(this._pollInterval);
    this._pollInterval = null;
  }

  async copyItem(item) {
    Clipboard.setString(item.text);
    this._lastText = item.text;
    item.count++;
    item.lastCopied = new Date().toISOString();
    await this._save();
  }

  pin(id) {
    const item = this.history.find(h => h.id === id);
    if (item && !this.pinned.find(p => p.id === id)) {
      this.pinned.push({ ...item, pinned: true });
      this._save();
    }
  }

  unpin(id)  { this.pinned = this.pinned.filter(p => p.id !== id); this._save(); }
  remove(id) { this.history = this.history.filter(h => h.id !== id); this._save(); }
  clear()    { this.history = []; this._save(); }

  getHistory(type) {
    if (type) return this.history.filter(h => h.type === type);
    return [...this.pinned, ...this.history];
  }
}

export default new SmartClipboard();
