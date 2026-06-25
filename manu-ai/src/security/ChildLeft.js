// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Child Left Behind Alert
// File: src/security/ChildLeft.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { BluetoothModule, AudioModule } = NativeModules;
const btEmitter = BluetoothModule ? new NativeEventEmitter(BluetoothModule) : null;

class ChildLeft {
  constructor() {
    this.isMonitoring = false;
    this.pairedDevices = [];
    this.subscription = null;
    this.alertTriggered = false;
    this.disconnectTime = null;
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_child_left_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.pairedDevices = config.pairedDevices || [];
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_child_left_config', JSON.stringify({ pairedDevices: this.pairedDevices }));
    } catch (e) {}
  }

  async startMonitoring() {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      if (!BluetoothModule || !BluetoothModule.startChildSeatMonitoring) {
        return { success: false, error: 'BluetoothModule unavailable' };
      }
      await BluetoothModule.startChildSeatMonitoring({ devices: this.pairedDevices });
      this.isMonitoring = true;
      if (btEmitter) {
        this.subscription = btEmitter.addListener('CHILD_SEAT_EVENT', (event) => {
          this.handleEvent(event);
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
      if (BluetoothModule && BluetoothModule.stopChildSeatMonitoring) {
        await BluetoothModule.stopChildSeatMonitoring();
      }
      this.isMonitoring = false;
      this.disconnectTime = null;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleEvent(event) {
    if (event.type === 'disconnected') {
      this.disconnectTime = Date.now();
      setTimeout(async () => {
        if (this.disconnectTime && Date.now() - this.disconnectTime >= 30000 && !this.alertTriggered) {
          await this.triggerAlert(event.device);
        }
      }, 30000);
    } else if (event.type === 'connected') {
      this.disconnectTime = null;
      this.alertTriggered = false;
    }
  }

  async triggerAlert(device) {
    this.alertTriggered = true;
    const alert = {
      timestamp: Date.now(),
      type: 'child_left_behind',
      severity: 'critical',
      device,
      message: 'Child seat Bluetooth device disconnected. Please check the vehicle before leaving.',
    };
    await AsyncStorage.setItem('@manu_child_left_alert', JSON.stringify(alert));
    try {
      if (AudioModule && AudioModule.playAlert) {
        await AudioModule.playAlert({ type: 'child_left', volume: 1.0, loop: true });
      }
    } catch (e) {}
  }

  async registerDevice(deviceId, name) {
    this.pairedDevices.push({ id: deviceId, name, registeredAt: Date.now() });
    await this.saveConfig();
    return { success: true, devices: this.pairedDevices.length };
  }

  async removeDevice(deviceId) {
    this.pairedDevices = this.pairedDevices.filter(d => d.id !== deviceId);
    await this.saveConfig();
    return { success: true };
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      pairedDevices: this.pairedDevices.length,
      alertTriggered: this.alertTriggered,
      disconnectTime: this.disconnectTime,
    };
  }

  async dismissAlert() {
    this.alertTriggered = false;
    this.disconnectTime = null;
    try {
      if (AudioModule && AudioModule.stopAlert) {
        await AudioModule.stopAlert();
      }
    } catch (e) {}
    return { dismissed: true };
  }
}

export default new ChildLeft();
