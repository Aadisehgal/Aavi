import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/PrivacyScan.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuPermissionManager, ManuNotificationManager } = NativeModules;

const PRIVACY_KEY = '@manu_ai_privacy_scan';
const PRIVACY_LOG_KEY = '@manu_ai_privacy_log';

class PrivacyScan {
  constructor() {
    this.lastScan = null;
    this.scanLog = [];
    this.maxLog = 50;
    this.riskThresholds = {
      high: ['READ_SMS', 'READ_CALL_LOG', 'READ_CONTACTS', 'CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION'],
      medium: ['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'BLUETOOTH', 'WIFI_STATE'],
    };
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(PRIVACY_KEY);
      if (s) this.lastScan = JSON.parse(s);
      const l = await AsyncStorage.getItem(PRIVACY_LOG_KEY);
      if (l) this.scanLog = JSON.parse(l);
    } catch (e) {
      console.warn('PrivacyScan load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(PRIVACY_KEY, JSON.stringify(this.lastScan));
      await AsyncStorage.setItem(PRIVACY_LOG_KEY, JSON.stringify(this.scanLog.slice(-this.maxLog)));
    } catch (e) {
      console.warn('PrivacyScan save error:', e);
    }
  }

  async scanPrivacy() {
    let appPermissions;
    try {
      if (ManuPermissionManager) {
        appPermissions = await ManuPermissionManager.getAllAppPermissions();
      } else {
        appPermissions = this.getMockPermissions();
      }
    } catch (e) {
      appPermissions = this.getMockPermissions();
    }

    const findings = [];
    const overusedApps = [];

    for (const app of appPermissions) {
      const riskScore = this.calculateRiskScore(app.permissions);
      const unusedPermissions = this.identifyUnusedPermissions(app);

      if (riskScore >= 7) {
        overusedApps.push({
          packageName: app.packageName,
          appName: app.appName,
          riskScore,
          permissions: app.permissions,
          unusedPermissions,
        });
      }

      for (const perm of app.permissions) {
        if (this.riskThresholds.high.includes(perm.name) && !perm.isUsed) {
          findings.push({
            app: app.appName,
            packageName: app.packageName,
            permission: perm.name,
            risk: 'high',
            reason: `Unused high-risk permission: ${perm.name}`,
            recommendation: `Revoke ${perm.name} from ${app.appName} if not needed.`,
          });
        }
      }
    }

    this.lastScan = {
      timestamp: Date.now(),
      appsScanned: appPermissions.length,
      overusedApps,
      findings: findings.sort((a, b) => (a.risk === 'high' ? -1 : 1)),
      overallRisk: overusedApps.length > 5 ? 'high' : overusedApps.length > 0 ? 'medium' : 'low',
    };

    this.scanLog.push({
      timestamp: Date.now(),
      findingsCount: findings.length,
      highRiskApps: overusedApps.length,
    });
    if (this.scanLog.length > this.maxLog) this.scanLog.shift();

    await this.saveData();

    if (this.lastScan.overallRisk !== 'low') {
      await this.notifyPrivacyIssues(this.lastScan);
    }

    return this.lastScan;
  }

  getMockPermissions() {
    return [
      {
        packageName: 'com.example.app1',
        appName: 'Example App',
        permissions: [
          { name: 'READ_CONTACTS', isUsed: false, lastUsed: 0 },
          { name: 'CAMERA', isUsed: true, lastUsed: Date.now() - 86400000 },
          { name: 'ACCESS_FINE_LOCATION', isUsed: false, lastUsed: 0 },
        ],
      },
    ];
  }

  calculateRiskScore(permissions) {
    let score = 0;
    for (const perm of permissions) {
      if (this.riskThresholds.high.includes(perm.name)) score += 3;
      else if (this.riskThresholds.medium.includes(perm.name)) score += 1;
      if (!perm.isUsed) score += 1; // Unused permissions add risk
    }
    return score;
  }

  identifyUnusedPermissions(app) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return app.permissions.filter(p => !p.isUsed || p.lastUsed < thirtyDaysAgo);
  }

  async notifyPrivacyIssues(scan) {
    const highRiskCount = scan.findings.filter(f => f.risk === 'high').length;
    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title: '🔐 Privacy Scan Alert',
          body: `Found ${scan.findings.length} privacy issues. ${highRiskCount} high-risk permissions unused.`,
          channelId: 'privacy_alerts',
          priority: highRiskCount > 0 ? 'high' : 'normal',
          data: { scanId: scan.timestamp },
        });
      }
    } catch (e) {}
  }

  async revokePermission(packageName, permissionName) {
    try {
      if (ManuPermissionManager) {
        await ManuPermissionManager.revokePermission(packageName, permissionName);
        this.scanLog.push({
          timestamp: Date.now(),
          action: 'revoke',
          packageName,
          permission: permissionName,
        });
        await this.saveData();
        return true;
      }
    } catch (e) {
      console.warn('Revoke failed:', e);
    }
    return false;
  }

  getLastScan() {
    return this.lastScan;
  }

  getScanLog() {
    return this.scanLog;
  }

  getRecommendations() {
    if (!this.lastScan) return [];
    return this.lastScan.findings.map(f => f.recommendation);
  }
}

export default new PrivacyScan();
