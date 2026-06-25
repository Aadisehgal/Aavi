// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Debug Mode Detection
// File: src/self/DebugDetect.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SecurityModule } = NativeModules;

class DebugDetect {
  constructor() {
    this.detected = false;
    this.alerts = [];
    this.checkInterval = null;
  }

  async init() {
    await this.loadAlerts();
    this.startMonitoring();
    return true;
  }

  async loadAlerts() {
    try {
      const stored = await AsyncStorage.getItem('@manu_debug_alerts');
      if (stored) this.alerts = JSON.parse(stored);
    } catch (e) {}
  }

  async saveAlerts() {
    try {
      await AsyncStorage.setItem('@manu_debug_alerts', JSON.stringify(this.alerts.slice(-100)));
    } catch (e) {}
  }

  startMonitoring() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.checkDebugState(), 10000);
    this.checkDebugState();
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkDebugState() {
    const findings = [];

    try {
      if (SecurityModule && SecurityModule.isDebuggerAttached) {
        const attached = await SecurityModule.isDebuggerAttached();
        if (attached) findings.push({ type: 'debugger_attached', severity: 'critical', time: Date.now() });
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.isDebugBuild) {
        const debugBuild = await SecurityModule.isDebugBuild();
        if (debugBuild) findings.push({ type: 'debug_build', severity: 'high', time: Date.now() });
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.isAdbEnabled) {
        const adb = await SecurityModule.isAdbEnabled();
        if (adb) findings.push({ type: 'adb_enabled', severity: 'medium', time: Date.now() });
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.isUsbDebuggingConnected) {
        const usbDebug = await SecurityModule.isUsbDebuggingConnected();
        if (usbDebug) findings.push({ type: 'usb_debug_connected', severity: 'high', time: Date.now() });
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.getDebugApps) {
        const debugApps = await SecurityModule.getDebugApps();
        if (debugApps && debugApps.length > 0) {
          findings.push({ type: 'debug_apps_present', severity: 'medium', apps: debugApps, time: Date.now() });
        }
      }
    } catch (e) {}

    if (findings.length > 0) {
      this.detected = true;
      this.alerts.push(...findings);
      await this.saveAlerts();
    }

    return findings;
  }

  async getDebugStatus() {
    const findings = await this.checkDebugState();
    return { detected: findings.length > 0, findings, alertCount: this.alerts.length, lastAlert: this.alerts.length > 0 ? this.alerts[this.alerts.length - 1] : null };
  }

  getAlerts() {
    return [...this.alerts];
  }

  async clearAlerts() {
    this.alerts = [];
    await AsyncStorage.removeItem('@manu_debug_alerts');
  }

  isMonitoring() {
    return this.checkInterval !== null;
  }
}

export default new DebugDetect();
