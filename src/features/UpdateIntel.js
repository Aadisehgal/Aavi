import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/UpdateIntel.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuPackageManager } = NativeModules;

const UPDATE_KEY = '@manu_ai_update_intel';
const UPDATE_LOG_KEY = '@manu_ai_update_log';

class UpdateIntel {
  constructor() {
    this.apps = [];
    this.updateLog = [];
    this.maxLog = 50;
    this.settings = {
      autoDownloadCritical: true,
      autoDownloadWifiOnly: true,
      notifySecurityUpdates: true,
      notifyFeatureUpdates: false,
      deferNonCriticalHours: 24,
    };
    this.loadData();
  }

  async loadData() {
    try {
      const a = await AsyncStorage.getItem(UPDATE_KEY);
      if (a) this.apps = JSON.parse(a);
      const l = await AsyncStorage.getItem(UPDATE_LOG_KEY);
      if (l) this.updateLog = JSON.parse(l);
    } catch (e) {
      console.warn('UpdateIntel load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(UPDATE_KEY, JSON.stringify(this.apps));
      await AsyncStorage.setItem(UPDATE_LOG_KEY, JSON.stringify(this.updateLog.slice(-this.maxLog)));
    } catch (e) {
      console.warn('UpdateIntel save error:', e);
    }
  }

  async scanForUpdates() {
    try {
      if (ManuPackageManager) {
        const pending = await ManuPackageManager.getPendingUpdates();
        for (const app of pending) {
          await this.processUpdateInfo(app);
        }
      }
    } catch (e) {
      console.warn('Update scan failed:', e);
    }
  }

  async processUpdateInfo(appInfo) {
    const existing = this.apps.find(a => a.packageName === appInfo.packageName);
    const update = {
      packageName: appInfo.packageName,
      appName: appInfo.appName || appInfo.packageName,
      currentVersion: appInfo.currentVersion,
      availableVersion: appInfo.availableVersion,
      updateSize: appInfo.updateSize || 0,
      isCritical: this.isCriticalUpdate(appInfo),
      isSecurity: this.isSecurityUpdate(appInfo),
      releaseNotes: appInfo.releaseNotes || '',
      detectedAt: Date.now(),
      priority: this.calculatePriority(appInfo),
      autoDownloadEligible: this.shouldAutoDownload(appInfo),
      status: 'pending',
    };

    if (existing) {
      Object.assign(existing, update);
    } else {
      this.apps.push(update);
    }
    await this.saveData();
  }

  isCriticalUpdate(appInfo) {
    const criticalKeywords = ['critical', 'crash', 'fix', 'bug', 'security', 'urgent', 'data loss'];
    const notes = (appInfo.releaseNotes || '').toLowerCase();
    return criticalKeywords.some(kw => notes.includes(kw)) || appInfo.priority === 'critical';
  }

  isSecurityUpdate(appInfo) {
    const securityKeywords = ['security', 'vulnerability', 'cve', 'exploit', 'patch', 'privacy'];
    const notes = (appInfo.releaseNotes || '').toLowerCase();
    return securityKeywords.some(kw => notes.includes(kw));
  }

  calculatePriority(appInfo) {
    if (this.isSecurityUpdate(appInfo)) return 'critical';
    if (this.isCriticalUpdate(appInfo)) return 'high';
    if (appInfo.updateSize > 100 * 1024 * 1024) return 'low'; // Large updates deferred
    return 'normal';
  }

  shouldAutoDownload(appInfo) {
    if (!this.settings.autoDownloadCritical) return false;
    if (!this.isCriticalUpdate(appInfo) && !this.isSecurityUpdate(appInfo)) return false;
    if (this.settings.autoDownloadWifiOnly && !appInfo.isWifiConnected) return false;
    return true;
  }

  async executeUpdate(packageName) {
    const app = this.apps.find(a => a.packageName === packageName);
    if (!app) return false;

    try {
      if (ManuPackageManager) {
        await ManuPackageManager.startUpdate(packageName);
      }
      app.status = 'downloading';
      this.updateLog.push({
        packageName,
        action: 'started',
        timestamp: Date.now(),
      });
      await this.saveData();
      return true;
    } catch (e) {
      console.warn('Update execution failed:', e);
      return false;
    }
  }

  getPendingUpdates() {
    return this.apps.filter(a => a.status === 'pending').sort((a, b) => {
      const prio = { critical: 0, high: 1, normal: 2, low: 3 };
      return prio[a.priority] - prio[b.priority];
    });
  }

  getCriticalUpdates() {
    return this.apps.filter(a => a.priority === 'critical' && a.status === 'pending');
  }

  getSecurityUpdates() {
    return this.apps.filter(a => a.isSecurity && a.status === 'pending');
  }

  deferUpdate(packageName, hours = null) {
    const app = this.apps.find(a => a.packageName === packageName);
    if (app) {
      app.deferredUntil = Date.now() + (hours || this.settings.deferNonCriticalHours) * 3600000;
      app.status = 'deferred';
      this.saveData();
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveData();
  }

  getSettings() {
    return this.settings;
  }

  getUpdateLog() {
    return this.updateLog;
  }
}

export default new UpdateIntel();
