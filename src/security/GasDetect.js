import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Gas Leak Detection
// File: src/security/GasDetect.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';


const { AudioModule } = NativeModules;
const audioEmitter = AudioModule ? new NativeEventEmitter(AudioModule) : null;

class GasDetect {
  constructor() {
    this.isMonitoring = false;
    this.subscription = null;
    this.hissConfidence = 0;
    this.alertTriggered = false;
    this.sensitivity = 0.6;
  }

  async init() {
    await this.loadState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_gas_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.alertTriggered = state.alertTriggered || false;
        this.sensitivity = state.sensitivity || 0.6;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_gas_state', JSON.stringify({ alertTriggered: this.alertTriggered, sensitivity: this.sensitivity }));
    } catch (e) {}
  }

  async startMonitoring(options = {}) {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      this.sensitivity = options.sensitivity || this.sensitivity;
      if (!AudioModule || !AudioModule.startGasDetection) {
        return { success: false, error: 'AudioModule unavailable' };
      }
      await AudioModule.startGasDetection({ sensitivity: this.sensitivity });
      this.isMonitoring = true;
      if (audioEmitter) {
        this.subscription = audioEmitter.addListener('GAS_AUDIO_EVENT', (event) => {
          this.handleAudioEvent(event);
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
      if (AudioModule && AudioModule.stopGasDetection) {
        await AudioModule.stopGasDetection();
      }
      this.isMonitoring = false;
      this.hissConfidence = 0;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleAudioEvent(event) {
    this.hissConfidence = event.hissConfidence || 0;
    const frequency = event.dominantFrequency || 0;
    const isHissFrequency = frequency > 2000 && frequency < 10000;
    if (this.hissConfidence > this.sensitivity && isHissFrequency && !this.alertTriggered) {
      await this.triggerAlert(frequency);
    }
  }

  async triggerAlert(frequency) {
    this.alertTriggered = true;
    const alert = {
      timestamp: Date.now(),
      type: 'gas_leak',
      severity: 'critical',
      hissConfidence: this.hissConfidence,
      frequency,
      message: `Gas leak detected: hissing sound at ${frequency}Hz with ${Math.round(this.hissConfidence * 100)}% confidence.`,
    };
    await AsyncStorage.setItem('@manu_gas_alert', JSON.stringify(alert));
    await this.saveState();
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      hissConfidence: this.hissConfidence,
      sensitivity: this.sensitivity,
      alertTriggered: this.alertTriggered,
    };
  }

  async setSensitivity(value) {
    if (value < 0 || value > 1) return { success: false, error: 'Sensitivity must be 0-1' };
    this.sensitivity = value;
    await this.saveState();
    return { success: true, sensitivity: value };
  }

  async resetAlert() {
    this.alertTriggered = false;
    this.hissConfidence = 0;
    await this.saveState();
    return { reset: true };
  }
}

export default new GasDetect();
