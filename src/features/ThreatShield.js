import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Proactive Threat Shield)
// File: src/features/ThreatShield.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { SmsModule, CallLogModule } = NativeModules;

const THREAT_LOG_KEY = '@manu_ai_threat_log';
const BLOCKED_KEY = '@manu_ai_blocked_senders';
const PARENT_ALERT_KEY = '@manu_ai_parent_alerts';

/**
 * ThreatShield detects bullying, abuse, and harmful content
 * in messages, calls, and app interactions. Logs threats for
 * parent review and can auto-block repeat offenders.
 */
class ThreatShield {
  constructor() {
    this.threatCategories = this._getThreatCategories();
    this.blockedSenders = new Set();
    this.severityThresholds = { low: 0.3, medium: 0.6, high: 0.85 };
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(BLOCKED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.blockedSenders = new Set(parsed);
      }
    } catch (e) {
      console.warn('[ThreatShield] Init error:', e);
    }
  }

  /**
   * Analyze text for threats, bullying, abuse, or harmful content.
   * Returns: { isThreat, severity, category, confidence, action, details }
   */
  analyze(text, source = 'unknown', sender = null) {
    const lowerText = (text || '').toLowerCase().trim();
    if (!lowerText) {
      return { isThreat: false, severity: 'none', category: null, confidence: 0, action: 'none', details: [] };
    }

    let maxScore = 0;
    let detectedCategory = null;
    const allMatches = [];

    for (const [category, config] of Object.entries(this.threatCategories)) {
      let categoryScore = 0;
      const matches = [];

      for (const keyword of config.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          categoryScore += config.weight;
          matches.push({ type: 'keyword', match: keyword, weight: config.weight });
        }
      }

      for (const pattern of config.patterns) {
        if (pattern.regex.test(lowerText)) {
          categoryScore += pattern.weight;
          matches.push({ type: 'pattern', match: pattern.name, weight: pattern.weight });
        }
      }

      // Repetition penalty — repeated threats increase severity
      const repeatedWords = this._countRepeatedThreatWords(lowerText, config.keywords);
      categoryScore += repeatedWords * 0.5;

      if (categoryScore > maxScore) {
        maxScore = categoryScore;
        detectedCategory = category;
      }

      if (matches.length > 0) {
        allMatches.push({ category, score: categoryScore, matches });
      }
    }

    const confidence = Math.min(maxScore / 6, 1.0);
    let severity = 'none';
    if (confidence >= this.severityThresholds.high) severity = 'high';
    else if (confidence >= this.severityThresholds.medium) severity = 'medium';
    else if (confidence >= this.severityThresholds.low) severity = 'low';

    const isThreat = severity !== 'none';
    const action = this._determineAction(severity, detectedCategory, sender);

    return {
      isThreat,
      severity,
      category: detectedCategory,
      confidence,
      action,
      details: allMatches,
      source,
      sender,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scan incoming message and take action if threat detected.
   */
  async scanMessage(text, sender, messageId = null) {
    const result = this.analyze(text, 'message', sender);

    if (result.isThreat) {
      await this._logThreat(result);
      await this._alertParent(result);

      if (result.severity === 'high' && sender) {
        await this._blockSender(sender);
      }

      if (Platform.OS === 'android' && SmsModule && result.severity === 'high') {
        try {
          await SmsModule.moveToSpam(messageId || sender);
        } catch (e) {
          console.warn('[ThreatShield] SMS move error:', e);
        }
      }
    }

    return result;
  }

  /**
   * Scan call transcript or call metadata for threats.
   */
  async scanCall(transcript, callerNumber, callDuration = 0) {
    const result = this.analyze(transcript, 'call', callerNumber);

    if (result.isThreat || callDuration > 0) {
      result.metadata = { callDuration, callerNumber };
      await this._logThreat(result);
      await this._alertParent(result);

      if (result.severity === 'high' && callerNumber) {
        await this._blockSender(callerNumber);
        if (Platform.OS === 'android' && CallLogModule) {
          try {
            await CallLogModule.blockNumber(callerNumber);
          } catch (e) {
            console.warn('[ThreatShield] Call block error:', e);
          }
        }
      }
    }

    return result;
  }

  /**
   * Batch scan multiple messages.
   */
  async scanBatch(messages) {
    const results = [];
    for (const msg of messages) {
      results.push(await this.scanMessage(msg.text, msg.sender, msg.id));
    }
    return results;
  }

  /**
   * Get threat log summary for parent dashboard.
   */
  async getThreatSummary(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    try {
      const stored = await AsyncStorage.getItem(THREAT_LOG_KEY);
      if (!stored) return { total: 0, high: 0, medium: 0, low: 0, byCategory: {}, recent: [] };
      const logs = JSON.parse(stored).filter(l => new Date(l.timestamp).getTime() > cutoff);
      const summary = {
        total: logs.length,
        high: logs.filter(l => l.severity === 'high').length,
        medium: logs.filter(l => l.severity === 'medium').length,
        low: logs.filter(l => l.severity === 'low').length,
        byCategory: {},
        recent: logs.slice(-10),
      };
      for (const log of logs) {
        if (log.category) {
          summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
        }
      }
      return summary;
    } catch (e) {
      return { total: 0, high: 0, medium: 0, low: 0, byCategory: {}, recent: [] };
    }
  }

  /**
   * Get blocked sender list.
   */
  async getBlockedSenders() {
    return Array.from(this.blockedSenders);
  }

  /**
   * Unblock a sender.
   */
  async unblockSender(sender) {
    this.blockedSenders.delete(sender);
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(Array.from(this.blockedSenders)));
  }

  /**
   * Check if a sender is blocked.
   */
  isBlocked(sender) {
    return this.blockedSenders.has(sender);
  }

  // --- Private helpers ---

  _getThreatCategories() {
    return {
      bullying: {
        keywords: ['loser', 'stupid', 'ugly', 'fat', 'worthless', 'pathetic', 'nobody likes you', 'kill yourself', 'kys', 'die', 'lame', 'weirdo', 'freak', 'idiot', 'dumb', 'moron'],
        patterns: [
          { name: 'repeated_insult', regex: /\b(loser|stupid|ugly|idiot).{0,10}\b(loser|stupid|ugly|idiot)\b/i, weight: 2.0 },
          { name: 'group_exclusion', regex: /\b(nobody wants you|no one likes you|everyone hates you)\b/i, weight: 2.5 },
          { name: 'physical_threat', regex: /\b(beat you up|hurt you|come for you|watch your back)\b/i, weight: 3.0 },
        ],
        weight: 2.0,
      },
      abuse: {
        keywords: ['hate you', 'disgusting', 'disappoint', 'failure', 'useless', 'burden', 'mistake', 'regret', 'wish you', 'never born'],
        patterns: [
          { name: 'emotional_abuse', regex: /\b(you are a|you are a).{0,15}(mistake|disappointment|failure|burden)\b/i, weight: 2.5 },
          { name: 'gaslighting', regex: /\b(you are imagining|that never happened|you are crazy|you are overreacting)\b/i, weight: 2.0 },
          { name: 'isolation', regex: /\b(don\'t talk to|stay away from|nobody believes you)\b/i, weight: 2.0 },
        ],
        weight: 2.5,
      },
      grooming: {
        keywords: ['secret', 'don\'t tell', 'between us', 'special friend', 'mature', 'grown up', 'adult', 'private', 'alone', 'meet up', 'pics', 'picture', 'send me'],
        patterns: [
          { name: 'secrecy_pressure', regex: /\b(don\'t tell anyone|this is our secret|keep it between us)\b/i, weight: 3.0 },
          { name: 'inappropriate_request', regex: /\b(send me (a )?pic|send photos|show me)\b/i, weight: 3.5 },
          { name: 'age_grooming', regex: /\b(you are mature|you seem older|grown up for your age)\b/i, weight: 2.5 },
        ],
        weight: 3.0,
      },
      self_harm: {
        keywords: ['cut myself', 'hurt myself', 'end it all', 'no point', 'better off dead', 'cannot go on', 'give up', 'suicide', 'overdose', 'die', 'kill myself'],
        patterns: [
          { name: 'suicidal_ideation', regex: /\b(i want to die|i wish i was dead|end my life|cannot take it anymore)\b/i, weight: 3.5 },
          { name: 'self_harm_plan', regex: /\b(i am going to|plan to|thinking about).{0,15}(hurt myself|cut|overdose|jump)\b/i, weight: 3.0 },
          { name: 'hopelessness', regex: /\b(no reason to live|nothing matters|everyone would be better off)\b/i, weight: 2.5 },
        ],
        weight: 3.5,
      },
      hate_speech: {
        keywords: ['hate', 'terrorist', 'inferior', 'subhuman', 'genocide', 'exterminate', 'cleanse', 'supremacy', 'master race'],
        patterns: [
          { name: 'violent_extremism', regex: /\b(kill all|death to|destroy the|wipe out)\b/i, weight: 3.5 },
          { name: 'dehumanization', regex: /\b(animals|parasites|vermin|cockroaches|rats).{0,10}(they are|those)\b/i, weight: 3.0 },
        ],
        weight: 3.0,
      },
    };
  }

  _countRepeatedThreatWords(text, keywords) {
    let count = 0;
    for (const keyword of keywords) {
      const matches = text.match(new RegExp(keyword.toLowerCase(), 'g'));
      if (matches && matches.length > 1) count += matches.length - 1;
    }
    return count;
  }

  _determineAction(severity, category, sender) {
    if (severity === 'high') return 'block_sender_and_alert_parent';
    if (severity === 'medium') return 'log_and_alert_parent';
    if (severity === 'low') return 'log_only';
    return 'none';
  }

  async _logThreat(result) {
    try {
      const stored = await AsyncStorage.getItem(THREAT_LOG_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      logs.push({
        severity: result.severity,
        category: result.category,
        source: result.source,
        sender: result.sender,
        timestamp: result.timestamp,
        confidence: result.confidence,
      });
      if (logs.length > 200) logs.shift();
      await AsyncStorage.setItem(THREAT_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('[ThreatShield] Log error:', e);
    }
  }

  async _alertParent(result) {
    try {
      const alert = {
        type: 'threat_detected',
        severity: result.severity,
        category: result.category,
        source: result.source,
        sender: result.sender,
        timestamp: result.timestamp,
        confidence: result.confidence,
      };
      const stored = await AsyncStorage.getItem(PARENT_ALERT_KEY);
      const alerts = stored ? JSON.parse(stored) : [];
      alerts.push(alert);
      if (alerts.length > 50) alerts.shift();
      await AsyncStorage.setItem(PARENT_ALERT_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.warn('[ThreatShield] Alert error:', e);
    }
  }

  async _blockSender(sender) {
    if (!sender) return;
    this.blockedSenders.add(sender);
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(Array.from(this.blockedSenders)));
  }

  async reset() {
    this.blockedSenders.clear();
    await AsyncStorage.multiRemove([THREAT_LOG_KEY, BLOCKED_KEY, PARENT_ALERT_KEY]);
  }
}

export default new ThreatShield();
