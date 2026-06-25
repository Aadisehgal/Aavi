// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Privacy Impact Score
// File: src/self/PrivacyScore.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PermissionTracker from './PermissionTracker';

const { AppUsageModule, NetworkModule } = NativeModules;

class PrivacyScore {
  constructor() {
    this.currentScore = null;
    this.factors = {};
  }

  async init() {
    await this.calculateScore();
    return true;
  }

  async calculateScore() {
    let score = 100;
    const factors = [];

    const permSummary = PermissionTracker.getPermissionSummary();
    const grantedCount = permSummary.granted.length;
    const highRiskCount = permSummary.highRisk.length;
    if (grantedCount > 8) {
      score -= 10;
      factors.push({ name: 'excess_permissions', impact: -10, detail: `${grantedCount} permissions granted` });
    }
    if (highRiskCount > 2) {
      score -= 15;
      factors.push({ name: 'high_risk_permissions', impact: -15, detail: `${highRiskCount} high-risk permissions active` });
    }

    const retentionPenalty = await this.checkDataRetention();
    if (retentionPenalty > 0) {
      score -= retentionPenalty;
      factors.push({ name: 'data_retention', impact: -retentionPenalty, detail: 'Old data not minimized' });
    }

    const networkPenalty = await this.checkNetworkExposure();
    if (networkPenalty > 0) {
      score -= networkPenalty;
      factors.push({ name: 'network_exposure', impact: -networkPenalty, detail: 'Unencrypted or excessive network calls' });
    }

    const bgPenalty = await this.checkBackgroundActivity();
    if (bgPenalty > 0) {
      score -= bgPenalty;
      factors.push({ name: 'background_activity', impact: -bgPenalty, detail: 'Excessive background data collection' });
    }

    const sharingPenalty = await this.checkThirdPartySharing();
    if (sharingPenalty > 0) {
      score -= sharingPenalty;
      factors.push({ name: 'third_party', impact: -sharingPenalty, detail: 'Data shared with external services' });
    }

    score = Math.max(0, Math.min(100, score));

    const result = {
      timestamp: Date.now(),
      score,
      rating: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
      factors,
      suggestions: this.generateSuggestions(factors, permSummary),
    };

    this.currentScore = result;
    await AsyncStorage.setItem('@manu_privacy_score', JSON.stringify(result));
    return result;
  }

  async checkDataRetention() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const manuKeys = keys.filter(k => k.startsWith('@manu_'));
      const oldKeys = [];
      for (const key of manuKeys) {
        try {
          const val = await AsyncStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed.timestamp && Date.now() - parsed.timestamp > 30 * 86400000) {
              oldKeys.push(key);
            }
          }
        } catch (e) {}
      }
      return oldKeys.length > 5 ? 10 : oldKeys.length > 0 ? 5 : 0;
    } catch (e) { return 0; }
  }

  async checkNetworkExposure() {
    try {
      if (NetworkModule && NetworkModule.getNetworkStats) {
        const stats = await NetworkModule.getNetworkStats();
        const unencrypted = stats.unencryptedCalls || 0;
        return unencrypted > 10 ? 10 : unencrypted > 0 ? 5 : 0;
      }
    } catch (e) {}
    return 0;
  }

  async checkBackgroundActivity() {
    try {
      if (AppUsageModule && AppUsageModule.getBackgroundStats) {
        const stats = await AppUsageModule.getBackgroundStats();
        const hours = stats.backgroundHours || 0;
        return hours > 48 ? 10 : hours > 24 ? 5 : 0;
      }
    } catch (e) {}
    return 0;
  }

  async checkThirdPartySharing() {
    try {
      const apiKeys = await AsyncStorage.getItem('@manu_api_keys');
      if (apiKeys) {
        const keys = JSON.parse(apiKeys);
        const external = Object.keys(keys).filter(k => k !== 'local');
        return external.length > 0 ? 10 : 0;
      }
    } catch (e) {}
    return 0;
  }

  generateSuggestions(factors, permSummary) {
    const suggestions = [];
    if (factors.find(f => f.name === 'excess_permissions')) {
      suggestions.push('Review and revoke unused permissions in Settings');
    }
    if (factors.find(f => f.name === 'high_risk_permissions')) {
      suggestions.push('Disable high-risk permissions when not actively needed');
    }
    if (factors.find(f => f.name === 'data_retention')) {
      suggestions.push('Run Data Minimization to clean old logs and cache');
    }
    if (factors.find(f => f.name === 'network_exposure')) {
      suggestions.push('Enable certificate pinning and TLS for all connections');
    }
    if (permSummary.suggestions.length > 0) {
      suggestions.push(`Consider revoking: ${permSummary.suggestions.map(s => s.permission).join(', ')}`);
    }
    if (suggestions.length === 0) {
      suggestions.push('Great privacy posture! Keep monitoring regularly.');
    }
    return suggestions;
  }

  getScore() {
    return this.currentScore;
  }

  async getLastScore() {
    try {
      const cached = await AsyncStorage.getItem('@manu_privacy_score');
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  }
}

export default new PrivacyScore();
