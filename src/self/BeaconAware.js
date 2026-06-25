// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Bluetooth Beacon Awareness
// File: src/self/BeaconAware.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { BLEModule } = NativeModules;
const bleEmitter = BLEModule ? new NativeEventEmitter(BLEModule) : null;

class BeaconAware {
  constructor() {
    this.knownBeacons = {};
    this.detectedBeacons = {};
    this.isScanning = false;
    this.subscriptions = [];
    this.geofenceActions = {};
  }

  async init() {
    await this.loadKnownBeacons();
    await this.loadGeofenceActions();
    return true;
  }

  async loadKnownBeacons() {
    try {
      const stored = await AsyncStorage.getItem('@manu_known_beacons');
      if (stored) this.knownBeacons = JSON.parse(stored);
    } catch (e) {}
  }

  async saveKnownBeacons() {
    try {
      await AsyncStorage.setItem('@manu_known_beacons', JSON.stringify(this.knownBeacons));
    } catch (e) {}
  }

  async loadGeofenceActions() {
    try {
      const stored = await AsyncStorage.getItem('@manu_beacon_actions');
      if (stored) this.geofenceActions = JSON.parse(stored);
    } catch (e) {}
  }

  async saveGeofenceActions() {
    try {
      await AsyncStorage.setItem('@manu_beacon_actions', JSON.stringify(this.geofenceActions));
    } catch (e) {}
  }

  async requestPermissions() {
    if (Platform.OS !== 'android') return { granted: true };
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      const allGranted = Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
      return { granted: allGranted, results };
    } catch (e) {
      return { granted: false, error: e.message };
    }
  }

  async startScanning() {
    if (this.isScanning) return { success: true, alreadyScanning: true };
    try {
      const perm = await this.requestPermissions();
      if (!perm.granted) return { success: false, error: 'Permissions denied' };
      if (!BLEModule || !BLEModule.startScan) {
        return { success: false, error: 'BLEModule unavailable' };
      }
      await BLEModule.startScan({ scanMode: 2, reportDelay: 1000 });
      this.isScanning = true;
      if (bleEmitter) {
        const sub = bleEmitter.addListener('BEACON_DETECTED', (event) => {
          this.handleBeacon(event);
        });
        this.subscriptions.push(sub);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async stopScanning() {
    try {
      this.subscriptions.forEach(s => s.remove());
      this.subscriptions = [];
      if (BLEModule && BLEModule.stopScan) {
        await BLEModule.stopScan();
      }
      this.isScanning = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleBeacon(event) {
    const beaconId = event.uuid || event.macAddress || 'unknown';
    const now = Date.now();
    this.detectedBeacons[beaconId] = { ...event, lastSeen: now, rssi: event.rssi || -100 };
    if (this.knownBeacons[beaconId]) {
      const action = this.geofenceActions[beaconId];
      if (action) {
        await this.executeAction(action, { beaconId, ...event });
      }
    }
    await this.logDetection(beaconId, event);
  }

  async executeAction(action, context) {
    switch (action.type) {
      case 'mute': break;
      case 'unmute': break;
      case 'launch_app': break;
      case 'send_notification': break;
      case 'change_setting': break;
      case 'log_location': break;
      default: break;
    }
  }

  async logDetection(beaconId, event) {
    try {
      const log = await AsyncStorage.getItem('@manu_beacon_log') || '[]';
      const logs = JSON.parse(log);
      logs.push({ timestamp: Date.now(), beaconId, rssi: event.rssi, uuid: event.uuid });
      await AsyncStorage.setItem('@manu_beacon_log', JSON.stringify(logs.slice(-500)));
    } catch (e) {}
  }

  async registerBeacon(beaconId, name, options = {}) {
    this.knownBeacons[beaconId] = { name, ...options, registeredAt: Date.now() };
    await this.saveKnownBeacons();
    return { success: true };
  }

  async removeBeacon(beaconId) {
    delete this.knownBeacons[beaconId];
    delete this.geofenceActions[beaconId];
    await this.saveKnownBeacons();
    await this.saveGeofenceActions();
    return { success: true };
  }

  async setAction(beaconId, action) {
    this.geofenceActions[beaconId] = action;
    await this.saveGeofenceActions();
    return { success: true };
  }

  getDetectedBeacons() {
    return { ...this.detectedBeacons };
  }

  getKnownBeacons() {
    return { ...this.knownBeacons };
  }

  async getDetectionLog() {
    try {
      const log = await AsyncStorage.getItem('@manu_beacon_log');
      return log ? JSON.parse(log) : [];
    } catch (e) { return []; }
  }

  isScanningActive() {
    return this.isScanning;
  }
}

export default new BeaconAware();
