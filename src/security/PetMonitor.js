import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Pet Monitor Mode
// File: src/security/PetMonitor.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';


const { SensorModule, AudioModule, CameraModule } = NativeModules;
const sensorEmitter = SensorModule ? new NativeEventEmitter(SensorModule) : null;

class PetMonitor {
  constructor() {
    this.isMonitoring = false;
    this.subscription = null;
    this.checkInterval = null;
    this.petDetected = false;
    this.lastMovement = null;
    this.alertTriggered = false;
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_pet_monitor_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.alertTriggered = config.alertTriggered || false;
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_pet_monitor_config', JSON.stringify({ alertTriggered: this.alertTriggered }));
    } catch (e) {}
  }

  async startMonitoring(options = {}) {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      const noMovementTimeout = options.noMovementTimeout || 1800000;
      if (!SensorModule || !SensorModule.startPetDetection) {
        return { success: false, error: 'SensorModule unavailable' };
      }
      await SensorModule.startPetDetection({ sensitivity: 0.5 });
      this.isMonitoring = true;
      if (sensorEmitter) {
        this.subscription = sensorEmitter.addListener('PET_SENSOR_EVENT', (event) => {
          this.handleSensorEvent(event);
        });
      }
      this.checkInterval = setInterval(async () => {
        if (this.lastMovement && Date.now() - this.lastMovement > noMovementTimeout && !this.alertTriggered) {
          await this.triggerAlert('no_movement');
        }
      }, 60000);
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
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      if (SensorModule && SensorModule.stopPetDetection) {
        await SensorModule.stopPetDetection();
      }
      this.isMonitoring = false;
      this.petDetected = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleSensorEvent(event) {
    if (event.movementDetected) {
      this.lastMovement = Date.now();
      this.petDetected = true;
    }
    if (event.soundDetected && event.soundType === 'distress') {
      await this.triggerAlert('distress_sound');
    }
  }

  async triggerAlert(reason) {
    this.alertTriggered = true;
    const alert = {
      timestamp: Date.now(),
      type: 'pet_monitor',
      severity: 'high',
      reason,
      message: reason === 'no_movement'
        ? 'No pet movement detected for 30+ minutes. Please check on your pet.'
        : 'Pet distress sound detected. Please check immediately.',
    };
    await AsyncStorage.setItem('@manu_pet_alert', JSON.stringify(alert));
    await this.saveConfig();
    try {
      if (AudioModule && AudioModule.playAlert) {
        await AudioModule.playAlert({ type: 'pet_alert', volume: 0.8 });
      }
    } catch (e) {}
  }

  async captureSnapshot() {
    try {
      if (CameraModule && CameraModule.capturePhoto) {
        return await CameraModule.capturePhoto({ encrypt: false, tag: 'pet_snapshot' });
      }
    } catch (e) {}
    return { success: false, error: 'CameraModule unavailable' };
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      petDetected: this.petDetected,
      lastMovement: this.lastMovement,
      alertTriggered: this.alertTriggered,
    };
  }

  async dismissAlert() {
    this.alertTriggered = false;
    await this.saveConfig();
    return { dismissed: true };
  }
}

export default new PetMonitor();
