// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Remote Wipe Trigger
// File: src/security/RemoteWipe.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureErase from '../self/SecureErase';

const { SMSModule, SecurityModule } = NativeModules;

class RemoteWipe {
  constructor() {
    this.wipeCode = null;
    this.enabled = false;
    this.wipeActions = ['data', 'cache', 'settings', 'evidence'];
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_wipe_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.wipeCode = config.wipeCode || null;
        this.enabled = config.enabled || false;
        this.wipeActions = config.wipeActions || ['data', 'cache', 'settings', 'evidence'];
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_wipe_config', JSON.stringify({
        wipeCode: this.wipeCode,
        enabled: this.enabled,
        wipeActions: this.wipeActions,
      }));
    } catch (e) {}
  }

  async setWipeCode(code) {
    if (!code || code.length < 6) {
      return { success: false, error: 'Wipe code must be at least 6 characters' };
    }
    this.wipeCode = code;
    this.enabled = true;
    await this.saveConfig();
    return { success: true };
  }

  async checkSMS(message) {
    if (!this.enabled || !this.wipeCode) return { triggered: false };
    if (message.includes(this.wipeCode)) {
      const result = await this.executeWipe();
      return { triggered: true, ...result };
    }
    return { triggered: false };
  }

  async executeWipe() {
    const report = { timestamp: Date.now(), actions: [], success: true };

    for (const action of this.wipeActions) {
      try {
        switch (action) {
          case 'data': await this.wipeData(); report.actions.push({ action: 'data', status: 'success' }); break;
          case 'cache': await this.wipeCache(); report.actions.push({ action: 'cache', status: 'success' }); break;
          case 'settings': await this.wipeSettings(); report.actions.push({ action: 'settings', status: 'success' }); break;
          case 'evidence': await this.wipeEvidence(); report.actions.push({ action: 'evidence', status: 'success' }); break;
          case 'accounts': await this.wipeAccounts(); report.actions.push({ action: 'accounts', status: 'success' }); break;
          default: report.actions.push({ action, status: 'unknown' });
        }
      } catch (e) {
        report.actions.push({ action, status: 'failed', error: e.message });
        report.success = false;
      }
    }

    await AsyncStorage.setItem('@manu_wipe_report', JSON.stringify(report));
    return report;
  }

  async wipeData() {
    await SecureErase.secureEraseAll();
  }

  async wipeCache() {
    try {
      if (SecurityModule && SecurityModule.clearCache) {
        await SecurityModule.clearCache();
      }
    } catch (e) {}
  }

  async wipeSettings() {
    const keys = await AsyncStorage.getAllKeys();
    const settingKeys = keys.filter(k => k.startsWith('@manu_') && !k.includes('evidence') && !k.includes('wipe'));
    for (const key of settingKeys) {
      await SecureErase.secureEraseAsyncStorage(key);
    }
  }

  async wipeEvidence() {
    const keys = await AsyncStorage.getAllKeys();
    const evidenceKeys = keys.filter(k => k.includes('evidence') || k.includes('log'));
    for (const key of evidenceKeys) {
      await SecureErase.secureEraseAsyncStorage(key);
    }
  }

  async wipeAccounts() {
    const keys = await AsyncStorage.getAllKeys();
    const accountKeys = keys.filter(k => k.includes('account') || k.includes('login') || k.includes('token'));
    for (const key of accountKeys) {
      await SecureErase.secureEraseAsyncStorage(key);
    }
  }

  async getConfig() {
    return { enabled: this.enabled, hasCode: !!this.wipeCode, wipeActions: this.wipeActions };
  }

  async getLastWipeReport() {
    try {
      const report = await AsyncStorage.getItem('@manu_wipe_report');
      return report ? JSON.parse(report) : null;
    } catch (e) { return null; }
  }
}

export default new RemoteWipe();
