import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Speed-Based Safety
// File: src/security/SpeedSafety.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';


const { LocationModule } = NativeModules;
const locationEmitter = LocationModule ? new NativeEventEmitter(LocationModule) : null;

const SPEED_THRESHOLDS = {
  WALKING: 1.4,
  CYCLING: 5.5,
  DRIVING: 13.9,
  HIGHWAY: 27.8,
};

class SpeedSafety {
  constructor() {
    this.currentSpeed = 0;
    this.isMonitoring = false;
    this.subscription = null;
    this.autoReplyEnabled = false;
    this.sosReady = false;
    this.speedHistory = [];
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_speed_safety_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.autoReplyEnabled = config.autoReplyEnabled || false;
        this.sosReady = config.sosReady || false;
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_speed_safety_config', JSON.stringify({
        autoReplyEnabled: this.autoReplyEnabled,
        sosReady: this.sosReady,
      }));
    } catch (e) {}
  }

  async startMonitoring() {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      if (!LocationModule || !LocationModule.startSpeedMonitoring) {
        return { success: false, error: 'LocationModule unavailable' };
      }
      await LocationModule.startSpeedMonitoring({ interval: 5000 });
      this.isMonitoring = true;
      if (locationEmitter) {
        this.subscription = locationEmitter.addListener('SPEED_UPDATE', (event) => {
          this.handleSpeedUpdate(event);
        });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async stopMonitoring() {
    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      if (LocationModule && LocationModule.stopSpeedMonitoring) {
        await LocationModule.stopSpeedMonitoring();
      }
      this.isMonitoring = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleSpeedUpdate(event) {
    const speed = event.speed || 0;
    this.currentSpeed = speed;
    this.speedHistory.push({ timestamp: Date.now(), speed });
    if (this.speedHistory.length > 100) this.speedHistory.shift();
    const mode = this.getSpeedMode(speed);
    if (mode === 'DRIVING' || mode === 'HIGHWAY') {
      if (this.autoReplyEnabled) {
        await this.triggerAutoReply();
      }
      if (this.sosReady) {
        await this.prepareSOS();
      }
    }
    await AsyncStorage.setItem('@manu_speed_history', JSON.stringify(this.speedHistory.slice(-50)));
  }

  getSpeedMode(speed) {
    if (speed >= SPEED_THRESHOLDS.HIGHWAY) return 'HIGHWAY';
    if (speed >= SPEED_THRESHOLDS.DRIVING) return 'DRIVING';
    if (speed >= SPEED_THRESHOLDS.CYCLING) return 'CYCLING';
    if (speed >= SPEED_THRESHOLDS.WALKING) return 'WALKING';
    return 'STATIONARY';
  }

  async triggerAutoReply() {
    try {
      if (LocationModule && LocationModule.setAutoReply) {
        await LocationModule.setAutoReply({
          message: "I am currently driving and will respond when it's safe to do so. — MANU AI",
          enabled: true,
        });
      }
    } catch (e) {}
  }

  async prepareSOS() {
    try {
      await AsyncStorage.setItem('@manu_sos_staged', JSON.stringify({ stagedAt: Date.now(), reason: 'high_speed' }));
    } catch (e) {}
  }

  async enableAutoReply(enabled) {
    this.autoReplyEnabled = enabled;
    await this.saveConfig();
    return { autoReplyEnabled: enabled };
  }

  async enableSOSReady(enabled) {
    this.sosReady = enabled;
    await this.saveConfig();
    return { sosReady: enabled };
  }

  getCurrentSpeed() {
    return { speed: this.currentSpeed, mode: this.getSpeedMode(this.currentSpeed) };
  }

  getSpeedHistory() {
    return [...this.speedHistory];
  }

  isMonitoringActive() {
    return this.isMonitoring;
  }
}

export default new SpeedSafety();
