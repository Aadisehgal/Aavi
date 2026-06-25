import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/AutoReply.js
// Feature 41 — Smart Auto-Reply for SMS/WhatsApp while busy

import { NativeModules} from 'react-native';

const { NotificationListenerModule } = NativeModules;
const STORAGE_KEY = '@manu_ai_autoreply';

const DEFAULT_RULES = [
  { id: '1', trigger: 'driving',  message: "I am driving right now. I'll reply when I am safe. — MANU AI", active: true },
  { id: '2', trigger: 'meeting',  message: "I am in a meeting. I'll get back to you shortly. — MANU AI",  active: true },
  { id: '3', trigger: 'sleeping', message: "I am unavailable right now. Expect a reply soon. — MANU AI",  active: false },
];

class AutoReply {
  constructor() {
    this.rules   = DEFAULT_RULES;
    this.enabled = false;
    this.activeMode = null;
    this.repliedTo  = new Set();  // avoid reply loops
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.rules      = data.rules   || DEFAULT_RULES;
        this.enabled    = data.enabled || false;
        this.activeMode = data.activeMode || null;
      }
    } catch (e) {
      console.warn('[AutoReply] Init error:', e);
    }
  }

  async save() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        rules: this.rules, enabled: this.enabled, activeMode: this.activeMode,
      }));
    } catch (e) { console.warn('[AutoReply] Save error:', e); }
  }

  enable(mode) {
    this.enabled    = true;
    this.activeMode = mode;
    this.repliedTo.clear();
    this.save();
  }

  disable() {
    this.enabled    = false;
    this.activeMode = null;
    this.save();
  }

  /**
   * Call this when a new notification arrives.
   * Returns the reply message if auto-reply should fire, null otherwise.
   */
  shouldReply(notification) {
    if (!this.enabled || !this.activeMode) return null;

    const { sender, packageName, text } = notification || {};
    // Only reply to messaging apps
    const isMessage = /sms|mms|whatsapp|telegram|signal|messenger/i.test(packageName || '');
    if (!isMessage) return null;

    // Prevent reply-loop
    const key = `${sender}:${packageName}`;
    if (this.repliedTo.has(key)) return null;

    const rule = this.rules.find(r => r.trigger === this.activeMode && r.active);
    if (!rule) return null;

    this.repliedTo.add(key);
    setTimeout(() => this.repliedTo.delete(key), 60 * 60 * 1000);  // reset after 1h
    return rule.message;
  }

  getStatus() {
    return { enabled: this.enabled, activeMode: this.activeMode, rules: this.rules };
  }

  updateRule(id, patch) {
    this.rules = this.rules.map(r => r.id === id ? { ...r, ...patch } : r);
    this.save();
  }

  addRule(trigger, message) {
    this.rules.push({ id: String(Date.now()), trigger, message, active: true });
    this.save();
  }
}

export default new AutoReply();
