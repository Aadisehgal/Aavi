// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Fire/Smoke Detection
// File: src/security/FireDetect.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { CameraModule, AudioModule } = NativeModules;
const cameraEmitter = CameraModule ? new NativeEventEmitter(CameraModule) : null;
const audioEmitter = AudioModule ? new NativeEventEmitter(AudioModule) : null;

class FireDetect {
  constructor() {
    this.isMonitoring = false;
    this.cameraSub = null;
    this.audioSub = null;
    this.fireConfidence = 0;
    this.smokeConfidence = 0;
    this.alertTriggered = false;
  }

  async init() {
    await this.loadState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_fire_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.alertTriggered = state.alertTriggered || false;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_fire_state', JSON.stringify({ alertTriggered: this.alertTriggered }));
    } catch (e) {}
  }

  async startMonitoring() {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      if (CameraModule && CameraModule.startFireDetection) {
        await CameraModule.startFireDetection({ interval: 1000 });
      }
      if (AudioModule && AudioModule.startFireAudioDetection) {
        await AudioModule.startFireAudioDetection({ sensitivity: 0.7 });
      }
      this.isMonitoring = true;
      if (cameraEmitter) {
        this.cameraSub = cameraEmitter.addListener('FIRE_CAMERA_EVENT', (event) => {
          this.handleCameraEvent(event);
        });
      }
      if (audioEmitter) {
        this.audioSub = audioEmitter.addListener('FIRE_AUDIO_EVENT', (event) => {
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
      if (this.cameraSub) {
        this.cameraSub.remove();
        this.cameraSub = null;
      }
      if (this.audioSub) {
        this.audioSub.remove();
        this.audioSub = null;
      }
      if (CameraModule && CameraModule.stopFireDetection) {
        await CameraModule.stopFireDetection();
      }
      if (AudioModule && AudioModule.stopFireAudioDetection) {
        await AudioModule.stopFireAudioDetection();
      }
      this.isMonitoring = false;
      this.fireConfidence = 0;
      this.smokeConfidence = 0;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleCameraEvent(event) {
    this.fireConfidence = event.fireConfidence || 0;
    this.smokeConfidence = event.smokeConfidence || 0;
    if ((this.fireConfidence > 0.75 || this.smokeConfidence > 0.7) && !this.alertTriggered) {
      await this.triggerAlert('camera');
    }
  }

  async handleAudioEvent(event) {
    const audioConfidence = event.fireAudioConfidence || 0;
    if (audioConfidence > 0.8 && !this.alertTriggered) {
      await this.triggerAlert('audio');
    }
  }

  async triggerAlert(source) {
    this.alertTriggered = true;
    const alert = {
      timestamp: Date.now(),
      type: 'fire_smoke',
      severity: 'critical',
      source,
      fireConfidence: this.fireConfidence,
      smokeConfidence: this.smokeConfidence,
      message: `Fire/smoke detected via ${source}. Confidence: Fire=${this.fireConfidence}, Smoke=${this.smokeConfidence}`,
    };
    await AsyncStorage.setItem('@manu_fire_alert', JSON.stringify(alert));
    await this.saveState();
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      fireConfidence: this.fireConfidence,
      smokeConfidence: this.smokeConfidence,
      alertTriggered: this.alertTriggered,
    };
  }

  async resetAlert() {
    this.alertTriggered = false;
    this.fireConfidence = 0;
    this.smokeConfidence = 0;
    await this.saveState();
    return { reset: true };
  }
}

export default new FireDetect();
