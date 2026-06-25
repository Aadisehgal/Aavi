import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/LocalCrash.js
// Generated: 2026-06-24
// Feature 122: Crash Report Local — No Firebase, local crash log

import { Platform } from 'react-native';

const CRASH_REPORTS_KEY = '@manu_ai/crash_reports';
const CRASH_CONFIG_KEY = '@manu_ai/crash_config';
const MAX_REPORTS = 100;

const DEFAULT_CONFIG = {
  enabled: true,
  includeStackTrace: true,
  includeDeviceInfo: true,
  includeAppState: true,
  autoRestart: false,
  maxReports: 100,
};

class LocalCrash {
  constructor() {
    this.reports = [];
    this.config = { ...DEFAULT_CONFIG };
    this.init();
  }

  async init() {
    await this.loadConfig();
    await this.loadReports();
    this.setupGlobalHandler();
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem(CRASH_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem(CRASH_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {}
  }

  async loadReports() {
    try {
      const stored = await AsyncStorage.getItem(CRASH_REPORTS_KEY);
      this.reports = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.reports = [];
    }
  }

  async saveReports() {
    try {
      const trimmed = this.reports.slice(-this.config.maxReports);
      await AsyncStorage.setItem(CRASH_REPORTS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  setupGlobalHandler() {
    if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.reportCrash(error, isFatal, 'JS_EXCEPTION');
        if (originalHandler) originalHandler(error, isFatal);
      });
    }

    // Native crash handler bridge
    if (global.__fbGenNativeModule && global.__fbGenNativeModule.setNativeExceptionHandler) {
      global.__fbGenNativeModule.setNativeExceptionHandler((error) => {
        this.reportCrash(error, true, 'NATIVE_EXCEPTION');
      });
    }
  }

  async reportCrash(error, isFatal = false, type = 'UNKNOWN') {
    if (!this.config.enabled) return;

    const report = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      isFatal: !!isFatal,
      message: error.message || 'Unknown error',
      stack: this.config.includeStackTrace ? (error.stack || '') : '',
      deviceInfo: this.config.includeDeviceInfo ? await this.getDeviceInfo() : {},
      appState: this.config.includeAppState ? { platform: Platform.OS, version: Platform.Version } : {},
      handled: false,
    };

    this.reports.push(report);
    await this.saveReports();

    if (this.config.autoRestart && isFatal) {
      // Trigger restart logic (handled by SelfRepairEngine)
    }

    return report;
  }

  async reportHandledException(error, context = {}) {
    if (!this.config.enabled) return;

    const report = {
      id: `handled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'HANDLED_EXCEPTION',
      isFatal: false,
      message: error.message || 'Unknown error',
      stack: this.config.includeStackTrace ? (error.stack || '') : '',
      context,
      deviceInfo: this.config.includeDeviceInfo ? await this.getDeviceInfo() : {},
      handled: true,
    };

    this.reports.push(report);
    await this.saveReports();
    return report;
  }

  async getDeviceInfo() {
    return {
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: '2.0.0',
      buildNumber: 200,
    };
  }

  async getReports(filter = {}) {
    let reports = [...this.reports];
    if (filter.type) reports = reports.filter(r => r.type === filter.type);
    if (filter.isFatal !== undefined) reports = reports.filter(r => r.isFatal === filter.isFatal);
    if (filter.handled !== undefined) reports = reports.filter(r => r.handled === filter.handled);
    if (filter.since) reports = reports.filter(r => r.timestamp >= filter.since);
    return reports.slice(-(filter.limit || 50));
  }

  async getCrashSummary() {
    const fatal = this.reports.filter(r => r.isFatal);
    const handled = this.reports.filter(r => r.handled);
    const unhandled = this.reports.filter(r => !r.handled && r.isFatal);

    const byType = {};
    this.reports.forEach(r => {
      if (!byType[r.type]) byType[r.type] = 0;
      byType[r.type] += 1;
    });

    const recent24h = this.reports.filter(r => r.timestamp > Date.now() - 86400000);

    return {
      totalReports: this.reports.length,
      fatalCount: fatal.length,
      handledCount: handled.length,
      unhandledCount: unhandled.length,
      byType,
      recent24h: recent24h.length,
    };
  }

  async exportReports() {
    return {
      exportDate: Date.now(),
      config: this.config,
      reports: this.reports,
    };
  }

  async clearReports() {
    this.reports = [];
    await AsyncStorage.removeItem(CRASH_REPORTS_KEY);
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }
}

export default new LocalCrash();
