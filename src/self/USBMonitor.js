import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — USB Device Monitor
// File: src/self/USBMonitor.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';


const { USBModule } = NativeModules;
const usbEmitter = USBModule ? new NativeEventEmitter(USBModule) : null;

class USBMonitor {
  constructor() {
    this.connectedDevices = {};
    this.isMonitoring = false;
    this.subscription = null;
    this.securityRules = { blockUnknown: false, alertOnConnect: true };
  }

  async init() {
    await this.loadRules();
    return true;
  }

  async loadRules() {
    try {
      const stored = await AsyncStorage.getItem('@manu_usb_rules');
      if (stored) this.securityRules = { ...this.securityRules, ...JSON.parse(stored) };
    } catch (e) {}
  }

  async saveRules() {
    try {
      await AsyncStorage.setItem('@manu_usb_rules', JSON.stringify(this.securityRules));
    } catch (e) {}
  }

  async startMonitoring() {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      if (!USBModule || !USBModule.startMonitoring) {
        return { success: false, error: 'USBModule unavailable' };
      }
      await USBModule.startMonitoring();
      this.isMonitoring = true;
      if (usbEmitter) {
        this.subscription = usbEmitter.addListener('USB_DEVICE_EVENT', (event) => {
          this.handleUSBEvent(event);
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
      if (USBModule && USBModule.stopMonitoring) {
        await USBModule.stopMonitoring();
      }
      this.isMonitoring = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleUSBEvent(event) {
    const deviceId = event.deviceId || event.vendorId + ':' + event.productId;
    const now = Date.now();
    if (event.type === 'connected') {
      this.connectedDevices[deviceId] = { ...event, connectedAt: now };
      await this.logEvent('connected', event);
      if (this.securityRules.alertOnConnect) {
        await this.securityCheck(event);
      }
    } else if (event.type === 'disconnected') {
      if (this.connectedDevices[deviceId]) {
        this.connectedDevices[deviceId].disconnectedAt = now;
        await this.logEvent('disconnected', this.connectedDevices[deviceId]);
        delete this.connectedDevices[deviceId];
      }
    }
  }

  async securityCheck(event) {
    const alerts = [];
    const known = await this.isKnownDevice(event);
    if (!known) {
      alerts.push({ severity: 'medium', message: `Unknown USB device connected: ${event.manufacturer || 'Unknown'} ${event.productName || ''}`, device: event });
    }
    const suspiciousVendors = ['0x18d1', '0x0502', '0x0b05'];
    if (suspiciousVendors.includes(event.vendorId)) {
      alerts.push({ severity: 'high', message: 'Suspicious USB vendor ID detected', device: event });
    }
    if (event.interfaceClass === 0xFF && event.interfaceSubClass === 0x42) {
      alerts.push({ severity: 'high', message: 'ADB interface detected on USB device', device: event });
    }
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
    }
    return alerts;
  }

  async isKnownDevice(event) {
    try {
      const known = await AsyncStorage.getItem('@manu_known_usb_devices');
      if (!known) return false;
      const devices = JSON.parse(known);
      return devices.some(d => d.vendorId === event.vendorId && d.productId === event.productId);
    } catch (e) { return false; }
  }

  async addKnownDevice(device) {
    try {
      const known = await AsyncStorage.getItem('@manu_known_usb_devices') || '[]';
      const devices = JSON.parse(known);
      devices.push({ ...device, addedAt: Date.now() });
      await AsyncStorage.setItem('@manu_known_usb_devices', JSON.stringify(devices));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async logEvent(type, event) {
    try {
      const log = await AsyncStorage.getItem('@manu_usb_log') || '[]';
      const logs = JSON.parse(log);
      logs.push({ timestamp: Date.now(), type, ...event });
      await AsyncStorage.setItem('@manu_usb_log', JSON.stringify(logs.slice(-200)));
    } catch (e) {}
  }

  async storeAlerts(alerts) {
    try {
      const stored = await AsyncStorage.getItem('@manu_usb_alerts') || '[]';
      const all = JSON.parse(stored);
      all.push(...alerts.map(a => ({ ...a, timestamp: Date.now() })));
      await AsyncStorage.setItem('@manu_usb_alerts', JSON.stringify(all.slice(-100)));
    } catch (e) {}
  }

  async setSecurityRule(rule, value) {
    this.securityRules[rule] = value;
    await this.saveRules();
    return { success: true };
  }

  getConnectedDevices() {
    return { ...this.connectedDevices };
  }

  async getEventLog() {
    try {
      const log = await AsyncStorage.getItem('@manu_usb_log');
      return log ? JSON.parse(log) : [];
    } catch (e) { return []; }
  }

  async getAlerts() {
    try {
      const alerts = await AsyncStorage.getItem('@manu_usb_alerts');
      return alerts ? JSON.parse(alerts) : [];
    } catch (e) { return []; }
  }

  isMonitoringActive() {
    return this.isMonitoring;
  }
}

export default new USBMonitor();
