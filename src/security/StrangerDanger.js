// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Stranger Danger Protocol
// File: src/security/StrangerDanger.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { ContactModule, SMSModule } = NativeModules;

class StrangerDanger {
  constructor() {
    this.trustedContacts = new Set();
    this.parentContacts = [];
    this.blockedSenders = new Set();
    this.alertHistory = [];
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_stranger_danger_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.trustedContacts = new Set(config.trustedContacts || []);
        this.parentContacts = config.parentContacts || [];
        this.blockedSenders = new Set(config.blockedSenders || []);
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_stranger_danger_config', JSON.stringify({
        trustedContacts: [...this.trustedContacts],
        parentContacts: this.parentContacts,
        blockedSenders: [...this.blockedSenders],
      }));
    } catch (e) {}
  }

  async analyzeMessage(sender, message, timestamp) {
    const result = { sender, timestamp, safe: true, threats: [], action: 'allow', alertParents: false };

    if (this.trustedContacts.has(sender)) {
      return result;
    }

    if (this.blockedSenders.has(sender)) {
      result.safe = false;
      result.action = 'block';
      result.threats.push({ type: 'blocked_sender', severity: 'high' });
      return result;
    }

    const lowerMsg = message.toLowerCase();
    const dangerPatterns = [
      { pattern: /(meet me|come alone|don't tell|secret|special friend)/i, type: 'grooming', severity: 'critical' },
      { pattern: /(send.*photo|send.*picture|what.*wearing)/i, type: 'inappropriate', severity: 'critical' },
      { pattern: /(your parents|mom|dad).*won't know/i, type: 'manipulation', severity: 'high' },
      { pattern: /(money|gift|prize|won|click.*link)/i, type: 'scam', severity: 'medium' },
      { pattern: /(where.*live|address|school|home)/i, type: 'info_harvesting', severity: 'high' },
    ];

    for (const threat of dangerPatterns) {
      if (threat.pattern.test(message)) {
        result.safe = false;
        result.threats.push({ type: threat.type, severity: threat.severity });
        result.action = 'block';
        result.alertParents = true;
      }
    }

    if (!result.safe) {
      const alert = { timestamp: Date.now(), sender, message, threats: result.threats };
      this.alertHistory.push(alert);
      await this.saveAlertHistory();
      if (result.alertParents) {
        await this.alertParents(sender, message, result.threats);
      }
    }

    return result;
  }

  async alertParents(sender, message, threats) {
    const threatTypes = threats.map(t => t.type).join(', ');
    const alertMsg = `STRANGER DANGER ALERT: Unknown sender ${sender} sent suspicious message. Threats: ${threatTypes}. Message: "${message.substring(0, 100)}" — MANU AI`;
    for (const parent of this.parentContacts) {
      try {
        if (SMSModule && SMSModule.sendSMS) {
          await SMSModule.sendSMS(parent.phone, alertMsg);
        }
      } catch (e) {}
    }
  }

  async saveAlertHistory() {
    try {
      await AsyncStorage.setItem('@manu_stranger_alerts', JSON.stringify(this.alertHistory.slice(-100)));
    } catch (e) {}
  }

  async addTrustedContact(phone) {
    this.trustedContacts.add(phone);
    await this.saveConfig();
    return { success: true };
  }

  async removeTrustedContact(phone) {
    this.trustedContacts.delete(phone);
    await this.saveConfig();
    return { success: true };
  }

  async addParentContact(name, phone) {
    this.parentContacts.push({ name, phone, addedAt: Date.now() });
    await this.saveConfig();
    return { success: true };
  }

  async blockSender(phone) {
    this.blockedSenders.add(phone);
    await this.saveConfig();
    return { success: true };
  }

  async unblockSender(phone) {
    this.blockedSenders.delete(phone);
    await this.saveConfig();
    return { success: true };
  }

  getAlertHistory() {
    return [...this.alertHistory];
  }

  async getConfig() {
    return {
      trustedContacts: [...this.trustedContacts],
      parentContacts: this.parentContacts,
      blockedSenders: [...this.blockedSenders],
    };
  }
}

export default new StrangerDanger();
