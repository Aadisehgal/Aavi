import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Intruder Detection
// File: src/security/IntruderDetect.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';


const { CameraModule, AudioModule } = NativeModules;
const cameraEmitter = CameraModule ? new NativeEventEmitter(CameraModule) : null;
const audioEmitter = AudioModule ? new NativeEventEmitter(AudioModule) : null;

class IntruderDetect {
  constructor() {
    this.isMonitoring = false;
    this.knownFaces = [];
    this.knownVoices = [];
    this.cameraSub = null;
    this.audioSub = null;
    this.alertTriggered = false;
  }

  async init() {
    await this.loadKnownProfiles();
    return true;
  }

  async loadKnownProfiles() {
    try {
      const faces = await AsyncStorage.getItem('@manu_known_faces');
      if (faces) this.knownFaces = JSON.parse(faces);
      const voices = await AsyncStorage.getItem('@manu_known_voices');
      if (voices) this.knownVoices = JSON.parse(voices);
    } catch (e) {}
  }

  async saveKnownProfiles() {
    try {
      await AsyncStorage.setItem('@manu_known_faces', JSON.stringify(this.knownFaces));
      await AsyncStorage.setItem('@manu_known_voices', JSON.stringify(this.knownVoices));
    } catch (e) {}
  }

  async startMonitoring() {
    if (this.isMonitoring) return { success: true, alreadyMonitoring: true };
    try {
      if (CameraModule && CameraModule.startIntruderDetection) {
        await CameraModule.startIntruderDetection({ interval: 2000 });
      }
      if (AudioModule && AudioModule.startVoiceDetection) {
        await AudioModule.startVoiceDetection({ sensitivity: 0.7 });
      }
      this.isMonitoring = true;
      if (cameraEmitter) {
        this.cameraSub = cameraEmitter.addListener('INTRUDER_CAMERA_EVENT', (event) => {
          this.handleCameraEvent(event);
        });
      }
      if (audioEmitter) {
        this.audioSub = audioEmitter.addListener('INTRUDER_AUDIO_EVENT', (event) => {
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
      if (CameraModule && CameraModule.stopIntruderDetection) {
        await CameraModule.stopIntruderDetection();
      }
      if (AudioModule && AudioModule.stopVoiceDetection) {
        await AudioModule.stopVoiceDetection();
      }
      this.isMonitoring = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleCameraEvent(event) {
    const faceDetected = event.faceDetected || false;
    const faceMatch = event.faceMatch || false;
    const confidence = event.confidence || 0;
    if (faceDetected && !faceMatch && confidence > 0.6 && !this.alertTriggered) {
      await this.triggerAlert('face', { confidence, features: event.faceFeatures });
    }
  }

  async handleAudioEvent(event) {
    const voiceDetected = event.voiceDetected || false;
    const voiceMatch = event.voiceMatch || false;
    const confidence = event.confidence || 0;
    if (voiceDetected && !voiceMatch && confidence > 0.6 && !this.alertTriggered) {
      await this.triggerAlert('voice', { confidence, pattern: event.voicePattern });
    }
  }

  async triggerAlert(source, details) {
    this.alertTriggered = true;
    const alert = {
      timestamp: Date.now(),
      type: 'intruder',
      severity: 'high',
      source,
      ...details,
      message: `Unknown ${source} detected with ${Math.round(details.confidence * 100)}% confidence.`,
    };
    await AsyncStorage.setItem('@manu_intruder_alert', JSON.stringify(alert));
    try {
      if (CameraModule && CameraModule.capturePhoto) {
        await CameraModule.capturePhoto({ encrypt: true, tag: 'intruder_evidence' });
      }
    } catch (e) {}
  }

  async registerFace(faceData) {
    this.knownFaces.push({ ...faceData, registeredAt: Date.now() });
    await this.saveKnownProfiles();
    return { success: true, count: this.knownFaces.length };
  }

  async registerVoice(voiceData) {
    this.knownVoices.push({ ...voiceData, registeredAt: Date.now() });
    await this.saveKnownProfiles();
    return { success: true, count: this.knownVoices.length };
  }

  async getStatus() {
    return {
      monitoring: this.isMonitoring,
      knownFaces: this.knownFaces.length,
      knownVoices: this.knownVoices.length,
      alertTriggered: this.alertTriggered,
    };
  }

  async resetAlert() {
    this.alertTriggered = false;
    return { reset: true };
  }
}

export default new IntruderDetect();
