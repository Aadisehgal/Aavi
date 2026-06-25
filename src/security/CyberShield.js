// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Cyberbullying Shield
// File: src/security/CyberShield.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SMSModule, NotificationModule } = NativeModules;

const TOXIC_PATTERNS = [
  { pattern: /(ugly|stupid|loser|worthless|kill yourself|kys|die|hate you)/i, type: 'verbal_abuse', severity: 'high' },
  { pattern: /(nobody likes you|no one cares|everyone hates you)/i, type: 'social_exclusion', severity: 'high' },
  { pattern: /(fat|skinny|disgusting|gross|weirdo|freak)/i, type: 'body_shaming', severity: 'medium' },
  { pattern: /(shut up|stfu|idiot|dumb|retard)/i, type: 'insult', severity: 'medium' },
  { pattern: /(spread.*rumor|telling everyone|everyone knows)/i, type: 'rumor_spreading', severity: 'high' },
  { pattern: /(screenshot|record|blackmail|expose)/i, type: 'threat', severity: 'critical' },
  { pattern: /(you are.*dead|i'm.*hurt you|come.*find you)/i, type: 'physical_threat', severity: 'critical' },
];

class CyberShield {
  constructor() {
    this.blockedMessages = [];
    this.evidenceLog = [];
    this.enabled = true;
    this.autoBlock = true;
    this.notifyParents = true;
    this.parentContacts = [];
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_cybershield_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.enabled = config.enabled !== false;
        this.autoBlock = config.autoBlock !== false;
        this.notifyParents = config.notifyParents !== false;
        this.parentContacts = config.parentContacts || [];
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_cybershield_config', JSON.stringify({
        enabled: this.enabled,
        autoBlock: this.autoBlock,
        notifyParents: this.notifyParents,
        parentContacts: this.parentContacts,
      }));
    } catch (e) {}
  }

  async analyzeMessage(sender, message, platform = 'unknown') {
    if (!this.enabled) return { safe: true, action: 'allow' };

    const result = { sender, platform, timestamp: Date.now(), safe: true, toxicity: [], action: 'allow', score: 0 };

    for (const toxic of TOXIC_PATTERNS) {
      if (toxic.pattern.test(message)) {
        result.safe = false;
        result.toxicity.push({ type: toxic.type, severity: toxic.severity });
        result.score += toxic.severity === 'critical' ? 50 : toxic.severity === 'high' ? 30 : 15;
      }
    }

    if (!result.safe) {
      result.score = Math.min(100, result.score);
      result.action = this.autoBlock ? 'block' : 'flag';
      const evidence = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...result,
        originalMessage: message,
      };
      this.evidenceLog.push(evidence);
      await this.saveEvidence();
      if (this.autoBlock) {
        this.blockedMessages.push(evidence);
      }
      if (this.notifyParents) {
        await this.notifyParents(sender, message, result.toxicity);
      }
    }

    return result;
  }

  async notifyParents(sender, message, toxicity) {
    const types = toxicity.map(t => t.type).join(', ');
    const alertMsg = `CYBERBULLYING ALERT: Toxic message detected from ${sender}. Types: ${types}. Message: "${message.substring(0, 100)}" — MANU AI CyberShield`;
    for (const parent of this.parentContacts) {
      try {
        if (SMSModule && SMSModule.sendSMS) {
          await SMSModule.sendSMS(parent.phone, alertMsg);
        }
      } catch (e) {}
    }
  }

  async saveEvidence() {
    try {
      await AsyncStorage.setItem('@manu_cybershield_evidence', JSON.stringify(this.evidenceLog.slice(-200)));
    } catch (e) {}
  }

  async getEvidence() {
    try {
      const stored = await AsyncStorage.getItem('@manu_cybershield_evidence');
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  async enable(value) {
    this.enabled = value;
    await this.saveConfig();
    return { enabled: value };
  }

  async setAutoBlock(value) {
    this.autoBlock = value;
    await this.saveConfig();
    return { autoBlock: value };
  }

  async addParentContact(name, phone) {
    this.parentContacts.push({ name, phone, addedAt: Date.now() });
    await this.saveConfig();
    return { success: true };
  }

  getBlockedCount() {
    return this.blockedMessages.length;
  }
}

export default new CyberShield();
