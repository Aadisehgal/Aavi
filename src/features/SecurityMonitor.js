import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/SecurityMonitor.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuDeviceInfo, ManuNotificationManager } = NativeModules;

const SECURITY_KEY = '@manu_ai_security_state';
const PATCH_HISTORY_KEY = '@manu_ai_patch_history';

class SecurityMonitor {
  constructor() {
    this.state = {
      osVersion: null,
      securityPatchLevel: null,
      lastChecked: null,
      vulnerabilities: [],
      isUpToDate: false,
    };
    this.patchHistory = [];
    this.maxHistory = 20;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(SECURITY_KEY);
      if (s) this.state = JSON.parse(s);
      const h = await AsyncStorage.getItem(PATCH_HISTORY_KEY);
      if (h) this.patchHistory = JSON.parse(h);
    } catch (e) {
      console.warn('SecurityMonitor load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(this.state));
      await AsyncStorage.setItem(PATCH_HISTORY_KEY, JSON.stringify(this.patchHistory.slice(-this.maxHistory)));
    } catch (e) {
      console.warn('SecurityMonitor save error:', e);
    }
  }

  async checkSecurityStatus() {
    let deviceInfo;
    try {
      if (ManuDeviceInfo) {
        deviceInfo = await ManuDeviceInfo.getSecurityInfo();
      } else {
        deviceInfo = this.getMockSecurityInfo();
      }
    } catch (e) {
      deviceInfo = this.getMockSecurityInfo();
    }

    const patchDate = deviceInfo.securityPatchLevel ? new Date(deviceInfo.securityPatchLevel) : null;
    const now = new Date();
    const monthsOld = patchDate ? (now - patchDate) / (1000 * 60 * 60 * 24 * 30) : 999;

    const vulnerabilities = await this.checkKnownVulnerabilities(deviceInfo.osVersion, deviceInfo.securityPatchLevel);
    const isUpToDate = monthsOld < 2 && vulnerabilities.length === 0;

    const previousPatch = this.state.securityPatchLevel;
    this.state = {
      osVersion: deviceInfo.osVersion,
      securityPatchLevel: deviceInfo.securityPatchLevel,
      lastChecked: Date.now(),
      vulnerabilities,
      isUpToDate,
      monthsSincePatch: parseFloat(monthsOld.toFixed(1)),
    };

    if (previousPatch && previousPatch !== deviceInfo.securityPatchLevel) {
      this.patchHistory.push({
        from: previousPatch,
        to: deviceInfo.securityPatchLevel,
        timestamp: Date.now(),
      });
    }

    await this.saveData();

    if (!isUpToDate) {
      await this.pushSecurityAlert(vulnerabilities, monthsOld);
    }

    return this.state;
  }

  getMockSecurityInfo() {
    return {
      osVersion: '14.0',
      securityPatchLevel: '2026-04-01',
      buildNumber: 'ABC123',
    };
  }

  async checkKnownVulnerabilities(osVersion, patchLevel) {
    // In production, fetch from device security bulletins or local CVE database
    // No hardcoded API keys — URL from settings
    try {
      const bulletinUrl = await AsyncStorage.getItem('@manu_ai_security_bulletin_url');
      if (bulletinUrl) {
        const response = await fetch(`${bulletinUrl}?version=${osVersion}&patch=${patchLevel}`, { timeout: 10000 });
        const data = await response.json();
        return data.vulnerabilities || [];
      }
    } catch (e) {}

    // Fallback: local heuristic checks
    const vulns = [];
    const patchDate = patchLevel ? new Date(patchLevel) : null;
    const now = new Date();
    if (patchDate && (now - patchDate) > 90 * 24 * 60 * 60 * 1000) {
      vulns.push({
        cve: 'UNKNOWN-OUTDATED',
        severity: 'high',
        description: 'Security patch is over 3 months old. System may be vulnerable to recent exploits.',
      });
    }
    return vulns;
  }

  async pushSecurityAlert(vulnerabilities, monthsOld) {
    let title, body;
    if (vulnerabilities.length > 0) {
      title = '🔒 Security Update Required';
      body = `${vulnerabilities.length} known vulnerabilities detected. Update your system immediately.`;
    } else if (monthsOld > 3) {
      title = '⚠️ Security Patch Outdated';
      body = `Your security patch is ${Math.floor(monthsOld)} months old. Check for OS updates.`;
    } else {
      title = 'ℹ️ Security Check';
      body = 'Your device security patch is aging. Consider updating soon.';
    }

    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title,
          body,
          channelId: 'security_alerts',
          priority: vulnerabilities.length > 0 ? 'high' : 'normal',
          ongoing: vulnerabilities.length > 0,
        });
      }
    } catch (e) {}
  }

  async checkForOSUpdate() {
    try {
      if (ManuDeviceInfo) {
        return await ManuDeviceInfo.checkForSystemUpdate();
      }
    } catch (e) {}
    return { available: false, version: null, size: 0 };
  }

  getSecurityStatus() {
    return this.state;
  }

  getPatchHistory() {
    return this.patchHistory;
  }

  isVulnerable() {
    return this.state.vulnerabilities.length > 0 || this.state.monthsSincePatch > 3;
  }
}

export default new SecurityMonitor();
