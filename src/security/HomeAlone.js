import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Home Alone Mode
// File: src/security/HomeAlone.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';


const { SensorModule, AudioModule, CameraModule } = NativeModules;
const sensorEmitter = SensorModule ? new NativeEventEmitter(SensorModule) : null;

class HomeAlone {
  constructor() {
    this.isMonitoring = false;
    this.subscription = null;
    this.checkInterval = null;
    this.parentContacts = [];
    this.checkInInterval = 900000;
    this.lastCheckIn = null;
    this.alertTriggered = false;
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_home_alone_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.parentContacts = config.parentContacts || [];
        this.checkInInterval = config.checkInInterval || 900000;
        this.alertTriggered = config.alertTriggered || false;
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_home_alone_config', JSON.stringify({
        parentContacts: this.parentContacts,
        checkInInterval: this.checkInInterval,
        alertTriggered: this.alertTriggered,
      }));
    } catch (e) {}
  }

  async startMonitoring(options = {}) {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      this.checkInInterval = options.checkInInterval || this.checkInInterval;
      if (!SensorModule || !SensorModule.startHomeAloneDetection) {
        return { success: false, error: 'SensorModule unavailable' };
      }
      await SensorModule.startHomeAloneDetection({ sensitivity: 0.5 });
      this.isMonitoring = true;
      this.lastCheckIn = Date.now();
      if (sensorEmitter) {
        this.subscription = sensorEmitter.addListener('HOME_ALONE_EVENT', (event) => {
          this.handleSensorEvent(event);
        });
      }
      this.checkInterval = setInterval(async () => {
        await this.performCheckIn();
      }, this.checkInInterval);
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
      if (SensorModule && SensorModule.stopHomeAloneDetection) {
        await SensorModule.stopHomeAloneDetection();
      }
      this.isMonitoring = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleSensorEvent(event) {
    if (event.doorOpened || event.windowOpened) {
      await this.triggerAlert('entry_detected', event);
    }
    if (event.unknownVoice) {
      await this.triggerAlert('unknown_voice', event);
    }
    if (event.panicButton) {
      await this.triggerAlert('panic_button', event);
    }
  }

  async performCheckIn() {
    const now = Date.now();
    this.lastCheckIn = now;
    await AsyncStorage.setItem('@manu_home_alone_last_checkin', String(now));
    if (this.parentContacts.length > 0) {
      for (const contact of this.parentContacts) {
        try {
          if (AudioModule && AudioModule.sendSMS) {
            await AudioModule.sendSMS(contact.phone, `Check-in: Child is safe at home. — MANU AI`);
          }
        } catch (e) {}
      }
    }
  }

  async triggerAlert(reason, details) {
    this.alertTriggered = true;
    await this.saveConfig();
    const alert = {
      timestamp: Date.now(),
      type: 'home_alone',
      severity: 'critical',
      reason,
      details,
      message: reason === 'entry_detected'
        ? 'Door or window opened while child is home alone.'
        : reason === 'unknown_voice'
        ? 'Unknown voice detected in the home.'
        : 'Child pressed emergency button.',
    };
    await AsyncStorage.setItem('@manu_home_alone_alert', JSON.stringify(alert));
    for (const contact of this.parentContacts) {
      try {
        if (AudioModule && AudioModule.sendSMS) {
          await AudioModule.sendSMS(contact.phone, `ALERT: ${alert.message} — MANU AI Home Alone Mode`);
        }
      } catch (e) {}
    }
    try {
      if (CameraModule && CameraModule.capturePhoto) {
        await CameraModule.capturePhoto({ encrypt: true, tag: 'home_alone_evidence' });
      }
    } catch (e) {}
  }

  async addParentContact(name, phone) {
    this.parentContacts.push({ name, phone, addedAt: Date.now() });
    await this.saveConfig();
    return { success: true, count: this.parentContacts.length };
  }

  async removeParentContact(phone) {
    this.parentContacts = this.parentContacts.filter(c => c.phone !== phone);
    await this.saveConfig();
    return { success: true };
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      lastCheckIn: this.lastCheckIn,
      alertTriggered: this.alertTriggered,
      parentContacts: this.parentContacts.length,
    };
  }

  async dismissAlert() {
    this.alertTriggered = false;
    await this.saveConfig();
    return { dismissed: true };
  }
}

export default new HomeAlone();
