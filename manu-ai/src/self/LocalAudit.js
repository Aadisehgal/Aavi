// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Local Security Audit
// File: src/self/LocalAudit.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SecurityModule, DeviceInfo } = NativeModules;

class LocalAudit {
  constructor() {
    this.auditHistory = [];
    this.schedule = null;
  }

  async init() {
    await this.loadHistory();
    this.scheduleWeekly();
    return true;
  }

  async loadHistory() {
    try {
      const stored = await AsyncStorage.getItem('@manu_audit_history');
      if (stored) this.auditHistory = JSON.parse(stored);
    } catch (e) {}
  }

  async saveHistory() {
    try {
      await AsyncStorage.setItem('@manu_audit_history', JSON.stringify(this.auditHistory.slice(-52)));
    } catch (e) {}
  }

  scheduleWeekly() {
    // In a real app, use BackgroundTask or AlarmManager
  }

  async runAudit() {
    const report = {
      timestamp: Date.now(),
      score: 100,
      findings: [],
      recommendations: [],
      severity: 'pass',
    };

    const rootCheck = await this.checkRoot();
    if (rootCheck.detected) {
      report.findings.push({ check: 'root', severity: 'high', detail: rootCheck.message });
      report.score -= 15;
    }

    const debugCheck = await this.checkDebugMode();
    if (debugCheck.detected) {
      report.findings.push({ check: 'debug', severity: 'critical', detail: debugCheck.message });
      report.score -= 25;
    }

    const lockCheck = await this.checkScreenLock();
    if (!lockCheck.enabled) {
      report.findings.push({ check: 'screen_lock', severity: 'high', detail: 'No screen lock configured' });
      report.score -= 20;
      report.recommendations.push('Enable PIN, pattern, or biometric lock');
    }

    const encryptCheck = await this.checkEncryption();
    if (!encryptCheck.encrypted) {
      report.findings.push({ check: 'encryption', severity: 'high', detail: 'Device storage not encrypted' });
      report.score -= 15;
      report.recommendations.push('Enable full-disk encryption');
    }

    const osCheck = await this.checkOSVersion();
    if (osCheck.outdated) {
      report.findings.push({ check: 'os_version', severity: 'medium', detail: osCheck.message });
      report.score -= 10;
      report.recommendations.push('Update to latest Android security patch');
    }

    const sourceCheck = await this.checkUnknownSources();
    if (sourceCheck.enabled) {
      report.findings.push({ check: 'unknown_sources', severity: 'medium', detail: 'Unknown app sources enabled' });
      report.score -= 10;
      report.recommendations.push('Disable "Unknown Sources" in settings');
    }

    const adbCheck = await this.checkADB();
    if (adbCheck.enabled) {
      report.findings.push({ check: 'adb', severity: 'medium', detail: 'USB debugging enabled' });
      report.score -= 5;
      report.recommendations.push('Disable USB debugging when not needed');
    }

    const criticalCount = report.findings.filter(f => f.severity === 'critical').length;
    const highCount = report.findings.filter(f => f.severity === 'high').length;
    if (criticalCount > 0) report.severity = 'critical';
    else if (highCount > 0) report.severity = 'warning';
    else if (report.findings.length > 0) report.severity = 'info';

    report.score = Math.max(0, report.score);
    this.auditHistory.push(report);
    await this.saveHistory();
    return report;
  }

  async checkRoot() {
    try {
      if (SecurityModule && SecurityModule.isRooted) {
        const rooted = await SecurityModule.isRooted();
        return { detected: rooted, message: rooted ? 'Root access detected' : 'No root detected' };
      }
    } catch (e) {}
    return { detected: false, message: 'Check unavailable' };
  }

  async checkDebugMode() {
    try {
      if (SecurityModule && SecurityModule.isDebugMode) {
        const debug = await SecurityModule.isDebugMode();
        return { detected: debug, message: debug ? 'Debug mode active' : 'Debug mode inactive' };
      }
    } catch (e) {}
    return { detected: false, message: 'Check unavailable' };
  }

  async checkScreenLock() {
    try {
      if (SecurityModule && SecurityModule.getScreenLockStatus) {
        const status = await SecurityModule.getScreenLockStatus();
        return { enabled: status.secure, type: status.type || 'none' };
      }
    } catch (e) {}
    return { enabled: true, type: 'unknown' };
  }

  async checkEncryption() {
    try {
      if (DeviceInfo && DeviceInfo.isStorageEncrypted) {
        const encrypted = await DeviceInfo.isStorageEncrypted();
        return { encrypted };
      }
    } catch (e) {}
    return { encrypted: true };
  }

  async checkOSVersion() {
    try {
      if (DeviceInfo && DeviceInfo.getSystemVersion) {
        const version = await DeviceInfo.getSystemVersion();
        const major = parseInt(version.split('.')[0]) || 0;
        return { outdated: major < 10, version, message: `Android ${version} detected` };
      }
    } catch (e) {}
    return { outdated: false, version: 'unknown', message: 'Version check unavailable' };
  }

  async checkUnknownSources() {
    try {
      if (SecurityModule && SecurityModule.isUnknownSourcesEnabled) {
        const enabled = await SecurityModule.isUnknownSourcesEnabled();
        return { enabled };
      }
    } catch (e) {}
    return { enabled: false };
  }

  async checkADB() {
    try {
      if (SecurityModule && SecurityModule.isAdbEnabled) {
        const enabled = await SecurityModule.isAdbEnabled();
        return { enabled };
      }
    } catch (e) {}
    return { enabled: false };
  }

  getHistory() {
    return [...this.auditHistory];
  }

  getLatest() {
    return this.auditHistory.length > 0 ? this.auditHistory[this.auditHistory.length - 1] : null;
  }
}

export default new LocalAudit();
