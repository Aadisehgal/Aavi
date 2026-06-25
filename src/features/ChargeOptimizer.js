import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/ChargeOptimizer.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuBatteryModule, ManuPowerManager } = NativeModules;

const CHARGE_KEY = '@manu_ai_charge_settings';
const CHARGE_LOG_KEY = '@manu_ai_charge_log';

class ChargeOptimizer {
  constructor() {
    this.settings = {
      slowChargeAtNight: true,
      nightStartHour: 23,
      nightEndHour: 6,
      fastChargeWhenUrgent: true,
      urgentThresholdPercent: 30,
      targetBatteryPercent: 80,
      optimizeBatteryHealth: true,
      notifyWhenFull: true,
    };
    this.chargeLog = [];
    this.maxLog = 100;
    this.isCharging = false;
    this.chargeStartTime = null;
    this.chargeStartLevel = null;
    this.monitorInterval = null;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(CHARGE_KEY);
      if (s) this.settings = { ...this.settings, ...JSON.parse(s) };
      const l = await AsyncStorage.getItem(CHARGE_LOG_KEY);
      if (l) this.chargeLog = JSON.parse(l);
    } catch (e) {
      console.warn('ChargeOptimizer load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(CHARGE_KEY, JSON.stringify(this.settings));
      await AsyncStorage.setItem(CHARGE_LOG_KEY, JSON.stringify(this.chargeLog.slice(-this.maxLog)));
    } catch (e) {
      console.warn('ChargeOptimizer save error:', e);
    }
  }

  async startMonitoring() {
    if (this.monitorInterval) return;
    await this.checkChargeState();
    this.monitorInterval = setInterval(() => this.checkChargeState(), 60000);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async checkChargeState() {
    try {
      const battery = await ManuBatteryModule.getBatteryInfo();
      const wasCharging = this.isCharging;
      this.isCharging = battery.isCharging;

      if (this.isCharging && !wasCharging) {
        // Charging started
        this.chargeStartTime = Date.now();
        this.chargeStartLevel = battery.level;
        await this.optimizeCharging(battery);
      } else if (!this.isCharging && wasCharging) {
        // Charging stopped
        this.recordChargeSession(battery);
      } else if (this.isCharging) {
        await this.optimizeCharging(battery);
      }
    } catch (e) {
      console.warn('Charge state check failed:', e);
    }
  }

  async optimizeCharging(battery) {
    const hour = new Date().getHours();
    const isNight = this.isNightTime(hour);
    const isUrgent = battery.level <= this.settings.urgentThresholdPercent;

    if (ManuPowerManager) {
      if (isNight && this.settings.slowChargeAtNight && !isUrgent) {
        // Enable slow/optimized charging
        await ManuPowerManager.setChargeRate('slow');
        await ManuPowerManager.setChargeLimit(this.settings.targetBatteryPercent);
      } else if (isUrgent && this.settings.fastChargeWhenUrgent) {
        // Fast charge when battery is critically low
        await ManuPowerManager.setChargeRate('fast');
        await ManuPowerManager.setChargeLimit(100);
      } else if (this.settings.optimizeBatteryHealth) {
        // Standard optimized charging
        await ManuPowerManager.setChargeRate('normal');
        await ManuPowerManager.setChargeLimit(this.settings.targetBatteryPercent);
      }
    }

    // Notify when fully charged to target
    if (this.settings.notifyWhenFull && battery.level >= this.settings.targetBatteryPercent) {
      await this.notifyFullCharge(battery);
    }
  }

  isNightTime(hour) {
    const start = this.settings.nightStartHour;
    const end = this.settings.nightEndHour;
    if (start < end) return hour >= start && hour < end;
    return hour >= start || hour < end;
  }

  async notifyFullCharge(battery) {
    try {
      if (NativeModules.ManuNotificationManager) {
        await NativeModules.ManuNotificationManager.showLocalNotification({
          title: '🔋 Charge Optimized',
          body: `Battery at ${battery.level}%. Unplug to preserve battery health.`,
          channelId: 'charge_alerts',
          priority: 'low',
        });
      }
    } catch (e) {}
  }

  recordChargeSession(battery) {
    if (!this.chargeStartTime || this.chargeStartLevel === null) return;
    const duration = Date.now() - this.chargeStartTime;
    const gain = battery.level - this.chargeStartLevel;

    this.chargeLog.push({
      startLevel: this.chargeStartLevel,
      endLevel: battery.level,
      gain,
      durationMinutes: Math.round(duration / 60000),
      wasOptimized: this.isNightTime(new Date(this.chargeStartTime).getHours()),
      timestamp: this.chargeStartTime,
    });
    if (this.chargeLog.length > this.maxLog) this.chargeLog.shift();
    this.saveData();

    this.chargeStartTime = null;
    this.chargeStartLevel = null;
  }

  getChargeStats() {
    const recent = this.chargeLog.slice(-10);
    if (recent.length === 0) return null;
    const avgDuration = recent.reduce((s, c) => s + c.durationMinutes, 0) / recent.length;
    const avgGain = recent.reduce((s, c) => s + c.gain, 0) / recent.length;
    return {
      totalSessions: this.chargeLog.length,
      averageDurationMinutes: Math.round(avgDuration),
      averageGainPercent: parseFloat(avgGain.toFixed(1)),
      optimizedSessions: recent.filter(c => c.wasOptimized).length,
      lastSession: recent[recent.length - 1],
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveData();
  }

  getSettings() {
    return this.settings;
  }
}

export default new ChargeOptimizer();
