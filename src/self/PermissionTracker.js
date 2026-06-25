// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Runtime Permission Tracker
// File: src/self/PermissionTracker.js
// Generated: 2026-06-25

import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PermissionModule } = NativeModules;

const PERMISSION_CATALOG = {
  CAMERA: { label: 'Camera', risk: 'high', reason: 'Can capture photos/video' },
  RECORD_AUDIO: { label: 'Microphone', risk: 'high', reason: 'Can record audio' },
  ACCESS_FINE_LOCATION: { label: 'Precise Location', risk: 'high', reason: 'Tracks exact GPS position' },
  ACCESS_COARSE_LOCATION: { label: 'Approximate Location', risk: 'medium', reason: 'Tracks general area' },
  READ_CONTACTS: { label: 'Contacts', risk: 'high', reason: 'Access to all contacts' },
  READ_SMS: { label: 'SMS Read', risk: 'high', reason: 'Can read text messages' },
  READ_PHONE_STATE: { label: 'Phone State', risk: 'medium', reason: 'Can read device identifiers' },
  READ_EXTERNAL_STORAGE: { label: 'External Storage Read', risk: 'medium', reason: 'Can read files' },
  WRITE_EXTERNAL_STORAGE: { label: 'External Storage Write', risk: 'medium', reason: 'Can modify files' },
  BLUETOOTH_CONNECT: { label: 'Bluetooth', risk: 'low', reason: 'Can connect to BLE devices' },
  POST_NOTIFICATIONS: { label: 'Notifications', risk: 'low', reason: 'Can show notifications' },
  SYSTEM_ALERT_WINDOW: { label: 'Overlay', risk: 'high', reason: 'Can draw over other apps' },
  BIND_ACCESSIBILITY_SERVICE: { label: 'Accessibility', risk: 'critical', reason: 'Can monitor all UI interactions' },
  BIND_NOTIFICATION_LISTENER_SERVICE: { label: 'Notification Listener', risk: 'critical', reason: 'Can read all notifications' },
};

class PermissionTracker {
  constructor() {
    this.usageLog = [];
    this.currentGrants = {};
    this.maxLogSize = 1000;
  }

  async init() {
    await this.loadLog();
    await this.refreshPermissions();
    return true;
  }

  async loadLog() {
    try {
      const stored = await AsyncStorage.getItem('@manu_perm_log');
      if (stored) this.usageLog = JSON.parse(stored);
    } catch (e) {}
  }

  async saveLog() {
    try {
      const trimmed = this.usageLog.slice(-this.maxLogSize);
      await AsyncStorage.setItem('@manu_perm_log', JSON.stringify(trimmed));
    } catch (e) {}
  }

  async refreshPermissions() {
    const results = {};
    for (const [perm, meta] of Object.entries(PERMISSION_CATALOG)) {
      results[perm] = { ...meta, granted: false, lastUsed: null };
      try {
        if (Platform.OS === 'android') {
          const status = await PermissionsAndroid.check(perm);
          results[perm].granted = status;
        }
      } catch (e) {}
    }
    this.currentGrants = results;
    return results;
  }

  async logPermissionUse(permission, context = '') {
    const entry = {
      timestamp: Date.now(),
      permission,
      context,
      granted: this.currentGrants[permission]?.granted || false,
    };
    this.usageLog.push(entry);
    await this.saveLog();
  }

  async requestPermission(permission, rationale = '') {
    try {
      if (Platform.OS !== 'android') return { granted: false };
      const result = await PermissionsAndroid.request(permission, {
        title: 'MANU AI Permission',
        message: rationale || PERMISSION_CATALOG[permission]?.reason || 'This permission is required.',
        buttonPositive: 'Grant',
        buttonNegative: 'Deny',
      });
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      await this.logPermissionUse(permission, 'user_request');
      await this.refreshPermissions();
      return { granted, result };
    } catch (e) {
      return { granted: false, error: e.message };
    }
  }

  getPermissionSummary() {
    const summary = { granted: [], denied: [], highRisk: [], suggestions: [] };
    for (const [perm, data] of Object.entries(this.currentGrants)) {
      if (data.granted) {
        summary.granted.push(perm);
        if (data.risk === 'high' || data.risk === 'critical') {
          summary.highRisk.push({ permission: perm, ...data });
        }
      } else {
        summary.denied.push(perm);
      }
    }

    const recentUses = this.getRecentUsage(7);
    for (const perm of summary.granted) {
      const uses = recentUses.filter(u => u.permission === perm);
      if (uses.length === 0 && PERMISSION_CATALOG[perm]?.risk === 'high') {
        summary.suggestions.push({
          permission: perm,
          reason: 'Not used in last 7 days, high risk — consider revoking',
          action: 'revoke',
        });
      }
    }

    return summary;
  }

  getRecentUsage(days = 7) {
    const cutoff = Date.now() - days * 86400000;
    return this.usageLog.filter(e => e.timestamp > cutoff);
  }

  async revokePermission(permission) {
    try {
      if (PermissionModule && PermissionModule.revokePermission) {
        await PermissionModule.revokePermission(permission);
        await this.logPermissionUse(permission, 'revoked_by_user');
        await this.refreshPermissions();
        return { success: true };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'Native revoke not available' };
  }

  getUsageStats() {
    const stats = {};
    for (const entry of this.usageLog) {
      if (!stats[entry.permission]) stats[entry.permission] = 0;
      stats[entry.permission]++;
    }
    return stats;
  }
}

export default new PermissionTracker();
