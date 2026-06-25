// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Elderly Care Mode
// File: src/security/ElderCare.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SensorModule, LocationModule, AudioModule } = NativeModules;
const sensorEmitter = SensorModule ? new NativeEventEmitter(SensorModule) : null;

class ElderCare {
  constructor() {
    this.isMonitoring = false;
    this.subscription = null;
    this.lastMovement = null;
    this.checkInterval = null;
    this.alertTriggered = false;
    this.emergencyContacts = [];
    this.noMovementTimeout = 3600000;
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_elder_care_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.emergencyContacts = config.emergencyContacts || [];
        this.noMovementTimeout = config.noMovementTimeout || 3600000;
        this.alertTriggered = config.alertTriggered || false;
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_elder_care_config', JSON.stringify({
        emergencyContacts: this.emergencyContacts,
        noMovementTimeout: this.noMovementTimeout,
        alertTriggered: this.alertTriggered,
      }));
    } catch (e) {}
  }

  async startMonitoring(options = {}) {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      this.noMovementTimeout = options.noMovementTimeout || this.noMovementTimeout;
      if (!SensorModule || !SensorModule.startElderCareDetection) {
        return { success: false, error: 'SensorModule unavailable' };
      }
      await SensorModule.startElderCareDetection({ sensitivity: 0.3 });
      this.isMonitoring = true;
      if (sensorEmitter) {
        this.subscription = sensorEmitter.addListener('ELDER_CARE_EVENT', (event) => {
          this.handleSensorEvent(event);
        });
      }
      this.checkInterval = setInterval(async () => {
        await this.checkWellness();
      }, 300000);
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
      if (SensorModule && SensorModule.stopElderCareDetection) {
        await SensorModule.stopElderCareDetection();
      }
      this.isMonitoring = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleSensorEvent(event) {
    if (event.movementDetected) {
      this.lastMovement = Date.now();
    }
    if (event.fallDetected) {
      await this.triggerAlert('fall');
    }
    if (event.noResponse) {
      await this.triggerAlert('no_response');
    }
  }

  async checkWellness() {
    if (!this.lastMovement) return;
    const timeSinceMovement = Date.now() - this.lastMovement;
    if (timeSinceMovement > this.noMovementTimeout && !this.alertTriggered) {
      await this.triggerAlert('no_movement');
    }
  }

  async triggerAlert(reason) {
    this.alertTriggered = true;
    await this.saveConfig();
    const alert = {
      timestamp: Date.now(),
      type: 'elder_care',
      severity: 'critical',
      reason,
      message: reason === 'fall'
        ? 'Fall detected. Emergency services may be needed.'
        : reason === 'no_movement'
        ? 'No movement detected for extended period. Wellness check needed.'
        : 'No response to periodic check-in.',
    };
    await AsyncStorage.setItem('@manu_elder_alert', JSON.stringify(alert));
    for (const contact of this.emergencyContacts) {
      try {
        if (AudioModule && AudioModule.sendSMS) {
          await AudioModule.sendSMS(contact.phone, alert.message);
        }
      } catch (e) {}
    }
    try {
      if (AudioModule && AudioModule.playAlert) {
        await AudioModule.playAlert({ type: 'elder_care', volume: 1.0 });
      }
    } catch (e) {}
  }

  async addEmergencyContact(name, phone) {
    this.emergencyContacts.push({ name, phone, addedAt: Date.now() });
    await this.saveConfig();
    return { success: true, count: this.emergencyContacts.length };
  }

  async removeEmergencyContact(phone) {
    this.emergencyContacts = this.emergencyContacts.filter(c => c.phone !== phone);
    await this.saveConfig();
    return { success: true };
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      lastMovement: this.lastMovement,
      alertTriggered: this.alertTriggered,
      emergencyContacts: this.emergencyContacts.length,
    };
  }

  async dismissAlert() {
    this.alertTriggered = false;
    await this.saveConfig();
    return { dismissed: true };
  }
}

export default new ElderCare();
