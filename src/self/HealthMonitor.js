import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Service Health Monitor
// File: src/self/HealthMonitor.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';


const { ManuCoreModule } = NativeModules;
const coreEmitter = ManuCoreModule ? new NativeEventEmitter(ManuCoreModule) : null;

const SERVICES = [
  'WakeWordService',
  'VoiceCommandService',
  'NotificationService',
  'AccessibilityService',
  'ScreenReaderService',
  'BackgroundTaskService',
  'NetworkMonitorService',
  'BatteryOptimizerService',
  'ThermalMonitorService',
  'MemoryManagerService',
];

const HEALTH_THRESHOLDS = {
  cpu: 80,
  memory: 85,
  batteryDrain: 15,
  crashCount: 3,
  latency: 500,
};

class HealthMonitor {
  constructor() {
    this.healthCache = {};
    this.checkInterval = null;
    this.listeners = [];
    this.lastReport = null;
  }

  async init() {
    await this.loadHealthCache();
    this.startMonitoring();
    return true;
  }

  async loadHealthCache() {
    try {
      const cached = await AsyncStorage.getItem('@manu_health_cache');
      if (cached) this.healthCache = JSON.parse(cached);
    } catch (e) {}
  }

  async saveHealthCache() {
    try {
      await AsyncStorage.setItem('@manu_health_cache', JSON.stringify(this.healthCache));
    } catch (e) {}
  }

  startMonitoring() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.runHealthCheck(), 30000);
    this.runHealthCheck();
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async runHealthCheck() {
    const report = { timestamp: Date.now(), services: {}, overall: 'healthy', issues: [] };

    for (const service of SERVICES) {
      const status = await this.checkService(service);
      report.services[service] = status;
      if (status.health !== 'healthy') {
        report.issues.push({ service, ...status });
      }
    }

    const issueCount = report.issues.length;
    if (issueCount > 5) report.overall = 'critical';
    else if (issueCount > 2) report.overall = 'warning';
    else if (issueCount > 0) report.overall = 'degraded';

    this.lastReport = report;
    this.healthCache[Date.now()] = report;
    await this.saveHealthCache();
    this.notifyListeners(report);
    return report;
  }

  async checkService(serviceName) {
    const status = { health: 'healthy', cpu: 0, memory: 0, uptime: 0, restarts: 0, latency: 0 };
    try {
      if (ManuCoreModule && ManuCoreModule.getServiceStatus) {
        const nativeStatus = await ManuCoreModule.getServiceStatus(serviceName);
        Object.assign(status, nativeStatus);
      }
    } catch (e) {
      status.health = 'unknown';
    }

    if (status.cpu > HEALTH_THRESHOLDS.cpu) status.health = 'warning';
    if (status.memory > HEALTH_THRESHOLDS.memory) status.health = 'warning';
    if (status.latency > HEALTH_THRESHOLDS.latency) status.health = 'degraded';
    if (status.restarts >= HEALTH_THRESHOLDS.crashCount) status.health = 'critical';

    return status;
  }

  notifyListeners(report) {
    this.listeners.forEach(cb => { try { cb(report); } catch (e) {} });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    if (this.lastReport) callback(this.lastReport);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  getLastReport() {
    return this.lastReport;
  }

  async getHealthHistory(hours = 24) {
    const cutoff = Date.now() - hours * 3600000;
    return Object.entries(this.healthCache)
      .filter(([ts]) => parseInt(ts) > cutoff)
      .map(([ts, report]) => ({ timestamp: parseInt(ts), ...report }));
  }

  async restartService(serviceName) {
    try {
      if (ManuCoreModule && ManuCoreModule.restartService) {
        return await ManuCoreModule.restartService(serviceName);
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'Native module unavailable' };
  }

  async getOverallHealth() {
    if (!this.lastReport) await this.runHealthCheck();
    return this.lastReport ? this.lastReport.overall : 'unknown';
  }
}

export default new HealthMonitor();
