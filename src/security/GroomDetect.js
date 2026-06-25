import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Grooming Detection
// File: src/security/GroomDetect.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';


const { SMSModule } = NativeModules;

const GROOMING_PATTERNS = [
  { pattern: /(special friend|secret friend|our little secret)/i, stage: 'trust_building', severity: 'high' },
  { pattern: /(do not tell|between us|no one needs to know)/i, stage: 'isolation', severity: 'critical' },
  { pattern: /(you are mature|so grown up|older than your age)/i, stage: 'flattery', severity: 'high' },
  { pattern: /(send.*pic|photo|video|see you)/i, stage: 'sexualization', severity: 'critical' },
  { pattern: /(meet.*alone|come over|pick you up)/i, stage: 'meeting', severity: 'critical' },
  { pattern: /(your parents|mom|dad).*angry|upset|mad/i, stage: 'undermining', severity: 'high' },
  { pattern: /(i love you|you are beautiful|thinking about you)/i, stage: 'emotional', severity: 'medium', context: 'rapid_escalation' },
  { pattern: /(gift|money|present|buy you)/i, stage: 'grooming', severity: 'high' },
];

const RAPID_ESCALATION = [
  'i love you', 'you are special', 'beautiful', 'thinking about you',
];

class GroomDetect {
  constructor() {
    this.conversationHistory = {};
    this.alerts = [];
    this.parentContacts = [];
    this.enabled = true;
    this.minSeverity = 'medium';
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_groom_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.parentContacts = config.parentContacts || [];
        this.enabled = config.enabled !== false;
        this.minSeverity = config.minSeverity || 'medium';
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_groom_config', JSON.stringify({
        parentContacts: this.parentContacts,
        enabled: this.enabled,
        minSeverity: this.minSeverity,
      }));
    } catch (e) {}
  }

  async analyzeConversation(sender, messages) {
    if (!this.enabled) return { safe: true, action: 'allow' };

    const result = { sender, timestamp: Date.now(), safe: true, stages: [], riskScore: 0, action: 'allow', evidence: [] };

    if (!this.conversationHistory[sender]) {
      this.conversationHistory[sender] = [];
    }
    this.conversationHistory[sender].push(...messages.map(m => ({ ...m, timestamp: Date.now() })));
    if (this.conversationHistory[sender].length > 100) {
      this.conversationHistory[sender] = this.conversationHistory[sender].slice(-100);
    }

    const allText = messages.map(m => m.text || m.body || '').join(' ').toLowerCase();
    const history = this.conversationHistory[sender];

    for (const pattern of GROOMING_PATTERNS) {
      if (pattern.pattern.test(allText)) {
        result.safe = false;
        result.stages.push({ stage: pattern.stage, severity: pattern.severity });
        result.riskScore += pattern.severity === 'critical' ? 40 : pattern.severity === 'high' ? 25 : 10;
        result.evidence.push({ pattern: pattern.stage, matched: true });
      }
    }

    if (history.length <= 5) {
      const escalationCount = RAPID_ESCALATION.filter(term => allText.includes(term)).length;
      if (escalationCount >= 2) {
        result.safe = false;
        result.stages.push({ stage: 'rapid_escalation', severity: 'critical' });
        result.riskScore += 35;
        result.evidence.push({ pattern: 'rapid_escalation', count: escalationCount });
      }
    }

    const uniqueStages = [...new Set(result.stages.map(s => s.stage))];
    if (uniqueStages.length >= 3) {
      result.riskScore += 30;
      result.evidence.push({ pattern: 'multi_stage', stages: uniqueStages });
    }

    result.riskScore = Math.min(100, result.riskScore);

    if (!result.safe) {
      result.action = result.riskScore >= 70 ? 'block_and_alert' : result.riskScore >= 40 ? 'flag' : 'monitor';
      const alert = { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, ...result };
      this.alerts.push(alert);
      await this.saveAlerts();
      if (result.riskScore >= 40) {
        await this.alertParents(sender, result);
      }
    }

    return result;
  }

  async alertParents(sender, result) {
    const stages = result.stages.map(s => s.stage).join(', ');
    const alertMsg = `GROOMING ALERT: Suspicious conversation pattern detected with ${sender}. Stages: ${stages}. Risk Score: ${result.riskScore}/100. — MANU AI`;
    for (const parent of this.parentContacts) {
      try {
        if (SMSModule && SMSModule.sendSMS) {
          await SMSModule.sendSMS(parent.phone, alertMsg);
        }
      } catch (e) {}
    }
  }

  async saveAlerts() {
    try {
      await AsyncStorage.setItem('@manu_groom_alerts', JSON.stringify(this.alerts.slice(-100)));
    } catch (e) {}
  }

  async getAlerts() {
    try {
      const stored = await AsyncStorage.getItem('@manu_groom_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  async addParentContact(name, phone) {
    this.parentContacts.push({ name, phone, addedAt: Date.now() });
    await this.saveConfig();
    return { success: true };
  }

  async enable(value) {
    this.enabled = value;
    await this.saveConfig();
    return { enabled: value };
  }

  async getConversationHistory(sender) {
    return this.conversationHistory[sender] || [];
  }
}

export default new GroomDetect();
