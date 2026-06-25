import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/ThermalManager.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuBatteryModule, ManuProcessManager, ManuNotificationManager } = NativeModules;

const THERMAL_KEY = '@manu_ai_thermal_state';
const THERMAL_LOG_KEY = '@manu_ai_thermal_log';

class ThermalManager {
  constructor() {
    this.thresholds = {
      warm: 40,
      hot: 45,
      critical: 50,
    };
    this.state = {
      currentTemp: 0,
      status: 'normal', // normal, warm, hot, critical
      actionsTaken: [],
      lastCheck: null,
    };
    this.log = [];
    this.maxLog = 100;
    this.monitorInterval = null;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(THERMAL_KEY);
      if (s) this.state = JSON.parse(s);
      const l = await AsyncStorage.getItem(THERMAL_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('ThermalManager load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(THERMAL_KEY, JSON.stringify(this.state));
      await AsyncStorage.setItem(THERMAL_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('ThermalManager save error:', e);
    }
  }

  async startMonitoring(intervalMs = 60000) {
    if (this.monitorInterval) return;
    await this.checkThermalState();
    this.monitorInterval = setInterval(() => this.checkThermalState(), intervalMs);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async checkThermalState() {
    try {
      const battery = await ManuBatteryModule.getBatteryInfo();
      const temp = battery.temperature || 0;
      const previousStatus = this.state.status;
      let status = 'normal';

      if (temp >= this.thresholds.critical) status = 'critical';
      else if (temp >= this.thresholds.hot) status = 'hot';
      else if (temp >= this.thresholds.warm) status = 'warm';

      this.state = {
        currentTemp: temp,
        status,
        actionsTaken: this.state.actionsTaken,
        lastCheck: Date.now(),
      };

      if (status !== previousStatus && (status === 'hot' || status === 'critical')) {
        await this.handleThermalThrottling(status, temp);
      }

      if (status === 'normal' && previousStatus !== 'normal') {
        await this.restoreNormalState();
      }

      await this.saveData();
    } catch (e) {
      console.warn('Thermal check failed:', e);
    }
  }

  async handleThermalThrottling(status, temp) {
    const actions = [];

    if (status === 'critical') {
      // Close background apps
      try {
        if (ManuProcessManager) {
          await ManuProcessManager.killBackgroundProcesses();
          actions.push('killed_background_apps');
        }
      } catch (e) {}

      // Reduce brightness
      try {
        if (NativeModules.ManuSettingsModule) {
          await NativeModules.ManuSettingsModule.setBrightness(50);
          actions.push('reduced_brightness');
        }
      } catch (e) {}

      // Notify user
      await this.notifyUser('🔥 Device Overheating', `Temperature: ${temp}°C. Closing background apps and reducing performance.`, 'critical');
    } else if (status === 'hot') {
      // Reduce CPU performance if available
      try {
        if (ManuProcessManager) {
          await ManuProcessManager.setCpuGovernor('powersave');
          actions.push('reduced_cpu_performance');
        }
      } catch (e) {}

      await this.notifyUser('🌡️ Device Hot', `Temperature: ${temp}°C. Reducing performance to cool down.`, 'high');
    }

    this.state.actionsTaken = actions;
    this.log.push({
      temperature: temp,
      status,
      actions,
      timestamp: Date.now(),
    });
    await this.saveData();
  }

  async restoreNormalState() {
    try {
      if (ManuProcessManager) {
        await ManuProcessManager.setCpuGovernor('default');
      }
      if (NativeModules.ManuSettingsModule) {
        await NativeModules.ManuSettingsModule.setBrightnessMode('auto');
      }
    } catch (e) {}

    this.state.actionsTaken = [];
    this.log.push({
      temperature: this.state.currentTemp,
      status: 'normal',
      actions: ['restored_defaults'],
      timestamp: Date.now(),
    });
    await this.saveData();
  }

  async notifyUser(title, body, priority) {
    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title,
          body,
          channelId: 'thermal_alerts',
          priority,
          ongoing: priority === 'critical',
        });
      }
    } catch (e) {}
  }

  setThresholds(warm, hot, critical) {
    this.thresholds = { warm, hot, critical };
  }

  getStatus() {
    return this.state;
  }

  getLog() {
    return this.log;
  }

  getPeakTemperature(hours = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recent = this.log.filter(l => l.timestamp > cutoff);
    if (recent.length === 0) return 0;
    return Math.max(...recent.map(l => l.temperature));
  }
}

export default new ThermalManager();
