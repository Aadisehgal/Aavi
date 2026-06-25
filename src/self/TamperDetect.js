import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Tamper Detection
// File: src/self/TamperDetect.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';


const { SecurityModule, PackageInfo } = NativeModules;

const CHECKSUM_KEYS = {
  '@manu_apk_checksum': 'apk',
  '@manu_dex_checksum': 'dex',
  '@manu_lib_checksum': 'lib',
  '@manu_manifest_checksum': 'manifest',
};

class TamperDetect {
  constructor() {
    this.baseline = {};
    this.alerts = [];
  }

  async init() {
    await this.loadBaseline();
    return true;
  }

  async loadBaseline() {
    try {
      for (const [key, type] of Object.entries(CHECKSUM_KEYS)) {
        const val = await AsyncStorage.getItem(key);
        if (val) this.baseline[type] = val;
      }
    } catch (e) {}
  }

  async saveBaseline(checksums) {
    try {
      for (const [type, hash] of Object.entries(checksums)) {
        await AsyncStorage.setItem(`@manu_${type}_checksum`, hash);
      }
      this.baseline = { ...checksums };
    } catch (e) {}
  }

  async establishBaseline() {
    try {
      if (!SecurityModule || !SecurityModule.computeChecksums) {
        return { success: false, error: 'SecurityModule unavailable' };
      }
      const checksums = await SecurityModule.computeChecksums();
      await this.saveBaseline(checksums);
      return { success: true, checksums };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyIntegrity() {
    const report = { timestamp: Date.now(), tampered: false, alerts: [] };

    try {
      if (!SecurityModule || !SecurityModule.computeChecksums) {
        report.error = 'SecurityModule unavailable';
        return report;
      }

      const current = await SecurityModule.computeChecksums();

      if (current.signatureHash !== this.baseline.signatureHash) {
        report.tampered = true;
        report.alerts.push({ type: 'signature_mismatch', severity: 'critical', detail: 'APK signature does not match baseline' });
      }

      if (current.dexHash !== this.baseline.dexHash) {
        report.tampered = true;
        report.alerts.push({ type: 'dex_modified', severity: 'critical', detail: 'Application code has been modified' });
      }

      if (current.libHash !== this.baseline.libHash) {
        report.tampered = true;
        report.alerts.push({ type: 'lib_modified', severity: 'critical', detail: 'Native libraries have been modified' });
      }

      if (current.manifestHash !== this.baseline.manifestHash) {
        report.tampered = true;
        report.alerts.push({ type: 'manifest_modified', severity: 'high', detail: 'AndroidManifest.xml has been modified' });
      }

      if (current.installerPackage && this.baseline.installerPackage &&
          current.installerPackage !== this.baseline.installerPackage) {
        report.tampered = true;
        report.alerts.push({ type: 'installer_changed', severity: 'medium', detail: `Installer changed from ${this.baseline.installerPackage} to ${current.installerPackage}` });
      }

      if (current.debuggable && !this.baseline.debuggable) {
        report.tampered = true;
        report.alerts.push({ type: 'debug_enabled', severity: 'high', detail: 'Debug flag enabled unexpectedly' });
      }

    } catch (e) {
      report.error = e.message;
    }

    if (report.tampered) {
      this.alerts.push(report);
      await AsyncStorage.setItem('@manu_tamper_alerts', JSON.stringify(this.alerts.slice(-50)));
    }

    return report;
  }

  async checkRuntimeTampering() {
    const runtimeAlerts = [];
    try {
      if (SecurityModule && SecurityModule.isDebuggable) {
        const debuggable = await SecurityModule.isDebuggable();
        if (debuggable) {
          runtimeAlerts.push({ type: 'runtime_debug', severity: 'high', detail: 'App is currently debuggable' });
        }
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.isDebuggerAttached) {
        const attached = await SecurityModule.isDebuggerAttached();
        if (attached) {
          runtimeAlerts.push({ type: 'debugger_attached', severity: 'critical', detail: 'Debugger detected at runtime' });
        }
      }
    } catch (e) {}

    return runtimeAlerts;
  }

  getAlerts() {
    return [...this.alerts];
  }

  async clearAlerts() {
    this.alerts = [];
    await AsyncStorage.removeItem('@manu_tamper_alerts');
  }
}

export default new TamperDetect();
