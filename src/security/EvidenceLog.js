import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Evidence Logger
// File: src/security/EvidenceLog.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';


const { MediaModule, CryptoModule } = NativeModules;

class EvidenceLog {
  constructor() {
    this.logEntries = [];
    this.autoRecord = false;
  }

  async init() {
    await this.loadEntries();
    return true;
  }

  async loadEntries() {
    try {
      const stored = await AsyncStorage.getItem('@manu_evidence_log');
      if (stored) this.logEntries = JSON.parse(stored);
    } catch (e) {}
  }

  async saveEntries() {
    try {
      await AsyncStorage.setItem('@manu_evidence_log', JSON.stringify(this.logEntries.slice(-200)));
    } catch (e) {}
  }

  async logEvent(type, data = {}) {
    const entry = {
      id: await this.generateId(),
      timestamp: Date.now(),
      type,
      data,
      hash: null,
      integrity: true,
    };
    entry.hash = await this.computeHash(JSON.stringify(entry));
    this.logEntries.push(entry);
    await this.saveEntries();
    return entry;
  }

  async generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async computeHash(data) {
    try {
      if (CryptoModule && CryptoModule.sha256) {
        return await CryptoModule.sha256(data);
      }
    } catch (e) {}
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return String(hash);
  }

  async startAutoRecord(options = {}) {
    this.autoRecord = true;
    const entry = await this.logEvent('auto_record_start', options);
    try {
      if (MediaModule && MediaModule.startRecording) {
        await MediaModule.startRecording({ duration: options.duration || 300, quality: options.quality || 'high', encrypt: true });
      }
    } catch (e) {}
    return entry;
  }

  async stopAutoRecord() {
    this.autoRecord = false;
    const entry = await this.logEvent('auto_record_stop', {});
    try {
      if (MediaModule && MediaModule.stopRecording) {
        await MediaModule.stopRecording();
      }
    } catch (e) {}
    return entry;
  }

  async capturePhoto(context = '') {
    try {
      if (MediaModule && MediaModule.capturePhoto) {
        const photo = await MediaModule.capturePhoto({ encrypt: true });
        return await this.logEvent('photo_capture', { ...photo, context });
      }
    } catch (e) {}
    return await this.logEvent('photo_capture_failed', { context, error: 'MediaModule unavailable' });
  }

  async captureAudio(duration = 30, context = '') {
    try {
      if (MediaModule && MediaModule.recordAudio) {
        const audio = await MediaModule.recordAudio({ duration, encrypt: true });
        return await this.logEvent('audio_capture', { ...audio, context });
      }
    } catch (e) {}
    return await this.logEvent('audio_capture_failed', { context, duration, error: 'MediaModule unavailable' });
  }

  async captureLocation(context = '') {
    try {
      if (MediaModule && MediaModule.getLocation) {
        const location = await MediaModule.getLocation();
        return await this.logEvent('location_capture', { ...location, context });
      }
    } catch (e) {}
    return await this.logEvent('location_capture_failed', { context, error: 'MediaModule unavailable' });
  }

  async verifyIntegrity(entryId) {
    const entry = this.logEntries.find(e => e.id === entryId);
    if (!entry) return { valid: false, error: 'Entry not found' };
    const computedHash = await this.computeHash(JSON.stringify({ ...entry, hash: null }));
    return { valid: computedHash === entry.hash, entry };
  }

  async verifyAll() {
    const results = [];
    for (const entry of this.logEntries) {
      results.push(await this.verifyIntegrity(entry.id));
    }
    const allValid = results.every(r => r.valid);
    return { allValid, results, total: results.length };
  }

  getEntries(type = null) {
    if (type) return this.logEntries.filter(e => e.type === type);
    return [...this.logEntries];
  }

  async exportEvidence(format = 'json') {
    const entries = this.getEntries();
    if (format === 'json') {
      return { success: true, data: JSON.stringify(entries, null, 2) };
    }
    return { success: false, error: 'Unsupported format' };
  }

  async clearEvidence() {
    this.logEntries = [];
    await AsyncStorage.removeItem('@manu_evidence_log');
    return { cleared: true };
  }
}

export default new EvidenceLog();
