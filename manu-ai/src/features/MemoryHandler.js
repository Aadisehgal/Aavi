import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/MemoryHandler.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuProcessManager, ManuNotificationManager } = NativeModules;

const MEMORY_KEY = '@manu_ai_memory_state';
const MEMORY_LOG_KEY = '@manu_ai_memory_log';

class MemoryHandler {
  constructor() {
    this.thresholds = {
      warning: 85, // RAM usage %
      critical: 95,
    };
    this.state = {
      totalRam: 0,
      availableRam: 0,
      usedPercent: 0,
      lastCheck: null,
    };
    this.log = [];
    this.maxLog = 100;
    this.monitorInterval = null;
    this.protectedApps = ['com.manu.ai']; // Don't kill self
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(MEMORY_KEY);
      if (s) this.state = JSON.parse(s);
      const l = await AsyncStorage.getItem(MEMORY_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('MemoryHandler load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(this.state));
      await AsyncStorage.setItem(MEMORY_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('MemoryHandler save error:', e);
    }
  }

  async startMonitoring(intervalMs = 120000) {
    if (this.monitorInterval) return;
    await this.checkMemoryState();
    this.monitorInterval = setInterval(() => this.checkMemoryState(), intervalMs);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async checkMemoryState() {
    try {
      let memInfo;
      if (ManuProcessManager) {
        memInfo = await ManuProcessManager.getMemoryInfo();
      } else {
        memInfo = { totalRam: 8192, availableRam: 1024, usedPercent: 87.5 };
      }

      this.state = {
        totalRam: memInfo.totalRam,
        availableRam: memInfo.availableRam,
        usedPercent: memInfo.usedPercent,
        lastCheck: Date.now(),
      };

      if (memInfo.usedPercent >= this.thresholds.critical) {
        await this.handleCriticalMemory();
      } else if (memInfo.usedPercent >= this.thresholds.warning) {
        await this.handleWarningMemory();
      }

      await this.saveData();
    } catch (e) {
      console.warn('Memory check failed:', e);
    }
  }

  async handleWarningMemory() {
    this.log.push({
      level: 'warning',
      usedPercent: this.state.usedPercent,
      action: 'monitored',
      timestamp: Date.now(),
    });
    await this.saveData();
  }

  async handleCriticalMemory() {
    const killedApps = [];
    try {
      if (ManuProcessManager) {
        const backgroundApps = await ManuProcessManager.getBackgroundApps();
        const targets = backgroundApps.filter(app =>
          !this.protectedApps.includes(app.packageName) &&
          app.memoryUsage > 50 // Kill apps using >50MB
        );

        // Sort by memory usage descending
        targets.sort((a, b) => b.memoryUsage - a.memoryUsage);

        // Kill top offenders until memory improves
        for (const app of targets.slice(0, 5)) {
          try {
            await ManuProcessManager.killApp(app.packageName);
            killedApps.push({ packageName: app.packageName, memoryFreed: app.memoryUsage });
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Auto-kill failed:', e);
    }

    const totalFreed = killedApps.reduce((sum, a) => sum + a.memoryFreed, 0);
    this.log.push({
      level: 'critical',
      usedPercent: this.state.usedPercent,
      action: 'auto_kill',
      killedApps,
      totalFreedMB: totalFreed,
      timestamp: Date.now(),
    });

    if (killedApps.length > 0) {
      await this.notifyUser(
        '🧹 Memory Cleared',
        `Closed ${killedApps.length} apps to free ${totalFreed}MB RAM.`,
        'normal'
      );
    }

    await this.saveData();
  }

  async notifyUser(title, body, priority) {
    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title,
          body,
          channelId: 'memory_alerts',
          priority,
        });
      }
    } catch (e) {}
  }

  addProtectedApp(packageName) {
    if (!this.protectedApps.includes(packageName)) {
      this.protectedApps.push(packageName);
    }
  }

  removeProtectedApp(packageName) {
    this.protectedApps = this.protectedApps.filter(p => p !== packageName);
  }

  setThresholds(warning, critical) {
    this.thresholds = { warning, critical };
  }

  getStatus() {
    return this.state;
  }

  getLog() {
    return this.log;
  }

  getAverageUsage(hours = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recent = this.log.filter(l => l.timestamp > cutoff);
    if (recent.length === 0) return 0;
    return parseFloat((recent.reduce((s, l) => s + l.usedPercent, 0) / recent.length).toFixed(1));
  }
}

export default new MemoryHandler();
