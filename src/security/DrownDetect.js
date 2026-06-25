import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Drowning Detection
// File: src/security/DrownDetect.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';


const { SensorModule } = NativeModules;
const sensorEmitter = SensorModule ? new NativeEventEmitter(SensorModule) : null;

class DrownDetect {
  constructor() {
    this.isMonitoring = false;
    this.subscription = null;
    this.waterDetected = false;
    this.noMovementStart = null;
    this.alertTriggered = false;
  }

  async init() {
    await this.loadState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_drown_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.alertTriggered = state.alertTriggered || false;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_drown_state', JSON.stringify({ alertTriggered: this.alertTriggered }));
    } catch (e) {}
  }

  async startMonitoring() {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      if (!SensorModule || !SensorModule.startDrownDetection) {
        return { success: false, error: 'SensorModule unavailable' };
      }
      await SensorModule.startDrownDetection({ waterThreshold: 0.8, noMovementTimeout: 15000 });
      this.isMonitoring = true;
      if (sensorEmitter) {
        this.subscription = sensorEmitter.addListener('DROWN_SENSOR', (event) => {
          this.handleSensorEvent(event);
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
      if (SensorModule && SensorModule.stopDrownDetection) {
        await SensorModule.stopDrownDetection();
      }
      this.isMonitoring = false;
      this.waterDetected = false;
      this.noMovementStart = null;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleSensorEvent(event) {
    const now = Date.now();
    if (event.waterDetected) {
      this.waterDetected = true;
      if (!this.noMovementStart) {
        this.noMovementStart = now;
      }
    } else {
      this.waterDetected = false;
      this.noMovementStart = null;
      this.alertTriggered = false;
    }
    if (event.movementDetected) {
      this.noMovementStart = now;
    }
    if (this.waterDetected && this.noMovementStart && (now - this.noMovementStart > 15000) && !this.alertTriggered) {
      this.alertTriggered = true;
      await this.triggerAlert();
    }
    await this.saveState();
  }

  async triggerAlert() {
    const alert = {
      timestamp: Date.now(),
      type: 'drowning',
      severity: 'critical',
      message: 'Water detected with no movement for 15+ seconds. Possible drowning.',
    };
    await AsyncStorage.setItem('@manu_drown_alert', JSON.stringify(alert));
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      waterDetected: this.waterDetected,
      noMovementDuration: this.noMovementStart ? Date.now() - this.noMovementStart : 0,
      alertTriggered: this.alertTriggered,
    };
  }

  async resetAlert() {
    this.alertTriggered = false;
    this.noMovementStart = null;
    await this.saveState();
    return { reset: true };
  }
}

export default new DrownDetect();
