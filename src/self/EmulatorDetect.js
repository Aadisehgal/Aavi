import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Emulator Detection
// File: src/self/EmulatorDetect.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';


const { DeviceInfo, SecurityModule } = NativeModules;

class EmulatorDetect {
  constructor() {
    this.lastCheck = null;
    this.warningShown = false;
  }

  async init() {
    await this.loadState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_emulator_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.warningShown = state.warningShown || false;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_emulator_state', JSON.stringify({ warningShown: this.warningShown }));
    } catch (e) {}
  }

  async detectEmulator() {
    const result = { detected: false, confidence: 0, indicators: [], warning: '', timestamp: Date.now() };

    try {
      if (DeviceInfo && DeviceInfo.getBuildConstants) {
        const build = await DeviceInfo.getBuildConstants();
        const emulatorProps = ['generic', 'google_sdk', 'sdk', 'sdk_x86', 'vbox86p', 'emulator', 'simulator'];
        const fingerprint = (build.FINGERPRINT || '').toLowerCase();
        const model = (build.MODEL || '').toLowerCase();
        const manufacturer = (build.MANUFACTURER || '').toLowerCase();
        const product = (build.PRODUCT || '').toLowerCase();
        const hardware = (build.HARDWARE || '').toLowerCase();

        for (const prop of emulatorProps) {
          if (fingerprint.includes(prop) || model.includes(prop) || manufacturer.includes(prop) ||
              product.includes(prop) || hardware.includes(prop)) {
            result.detected = true;
            result.indicators.push(`build_${prop}`);
            result.confidence += 15;
          }
        }

        if (hardware === 'goldfish' || hardware === 'ranchu') {
          result.detected = true;
          result.indicators.push('qemu_hardware');
          result.confidence += 25;
        }
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.getDeviceFeatures) {
        const features = await SecurityModule.getDeviceFeatures();
        if (!features.hasCamera) { result.indicators.push('no_camera'); result.confidence += 10; }
        if (!features.hasBluetooth) { result.indicators.push('no_bluetooth'); result.confidence += 5; }
        if (!features.hasGps) { result.indicators.push('no_gps'); result.confidence += 5; }
        if (features.cpuCount && features.cpuCount <= 2) { result.indicators.push('low_cpu_count'); result.confidence += 5; }
      }
    } catch (e) {}

    try {
      if (DeviceInfo && DeviceInfo.getPhoneNumber) {
        const phone = await DeviceInfo.getPhoneNumber();
        if (!phone || phone === '0000000000') {
          result.indicators.push('fake_phone_number');
          result.confidence += 10;
        }
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.fileExists) {
        const emulatorFiles = ['/dev/socket/qemud', '/dev/qemu_pipe'];
        for (const file of emulatorFiles) {
          const exists = await SecurityModule.fileExists(file);
          if (exists) {
            result.detected = true;
            result.indicators.push(`file:${file}`);
            result.confidence += 20;
          }
        }
      }
    } catch (e) {}

    result.confidence = Math.min(100, result.confidence);
    if (result.detected) {
      result.warning = `Emulator environment detected (confidence: ${result.confidence}%). MANU AI will work normally, but some hardware-dependent features may not function as expected. For full functionality, please run on a physical device.`;
    }

    this.lastCheck = result;
    await AsyncStorage.setItem('@manu_emulator_last_check', JSON.stringify(result));
    return result;
  }

  async shouldShowWarning() {
    if (this.warningShown) return false;
    const check = await this.detectEmulator();
    return check.detected && check.confidence >= 50;
  }

  async markWarningShown() {
    this.warningShown = true;
    await this.saveState();
  }

  getLastCheck() {
    return this.lastCheck;
  }
}

export default new EmulatorDetect();
