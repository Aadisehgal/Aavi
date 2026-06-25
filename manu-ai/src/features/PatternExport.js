import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/PatternExport.js
// Feature 50 — Export learned patterns, preferences, and AI insights to file

import { Platform } from 'react-native';

const EXPORT_KEYS = [
  '@manu_ai_notification_patterns',
  '@manu_ai_notification_ai',
  '@manu_ai_trust_scores',
  '@manu_ai_sms_filter',
  '@manu_ai_clipboard',
  '@manu_ai_autoreply',
  '@manu_ai_personality',
  '@manu_ai_transcripts',
];

class PatternExport {

  /**
   * Collect all learned data from AsyncStorage.
   * @returns {object} full data export
   */
  async collectData() {
    const result = { exportedAt: new Date().toISOString(), version: '2.0', data: {} };
    for (const key of EXPORT_KEYS) {
      try {
        const val = await AsyncStorage.getItem(key);
        if (val) result.data[key] = JSON.parse(val);
      } catch (e) { /* skip unreadable keys */ }
    }
    return result;
  }

  /**
   * Export data as a JSON string (caller handles file write / share).
   */
  async exportJSON() {
    const data = await this.collectData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Build a human-readable summary report.
   */
  async exportSummary() {
    const data = await this.collectData();
    const lines = [
      '═══════════════════════════════════',
      '  MANU AI — Pattern Export Report',
      `  ${data.exportedAt}`,
      '═══════════════════════════════════',
      '',
    ];

    const personality = data.data['@manu_ai_personality'];
    if (personality) {
      lines.push('▶ PERSONALITY');
      lines.push(`  Owner: ${personality.ownerName || 'Not set'}`);
      lines.push(`  Persona: ${personality.selectedVoice || 'jarvis'}`);
      lines.push(`  Tone: ${personality.selectedTone || 'Professional'}`);
      lines.push('');
    }

    const trust = data.data['@manu_ai_trust_scores'];
    if (trust) {
      const count = Object.keys(trust).length;
      lines.push(`▶ TRUST SCORES: ${count} contacts profiled`);
      lines.push('');
    }

    const sms = data.data['@manu_ai_sms_filter'];
    if (sms) {
      lines.push(`▶ SMS FILTER: ${sms.spamCount || 0} spam, ${sms.phishCount || 0} phishing blocked`);
      lines.push('');
    }

    const clipboard = data.data['@manu_ai_clipboard'];
    if (clipboard) {
      lines.push(`▶ CLIPBOARD: ${clipboard.history?.length || 0} entries in history`);
      lines.push('');
    }

    lines.push('═══════════════════════════════════');
    return lines.join('\n');
  }

  /**
   * Import data from a previously exported JSON string.
   * @returns {{ imported: number, errors: number }}
   */
  async importJSON(jsonString) {
    let imported = 0; let errors = 0;
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || parsed.version !== '2.0') throw new Error('Invalid export format');
      for (const [key, value] of Object.entries(parsed.data)) {
        try {
          await AsyncStorage.setItem(key, JSON.stringify(value));
          imported++;
        } catch (e) { errors++; }
      }
    } catch (e) {
      throw new Error(`Import failed: ${e.message}`);
    }
    return { imported, errors };
  }

  /**
   * Wipe all learned data (factory reset patterns only).
   */
  async clearAllData() {
    for (const key of EXPORT_KEYS) {
      try { await AsyncStorage.removeItem(key); }
      catch (e) { /* ignore */ }
    }
  }
}

export default new PatternExport();
