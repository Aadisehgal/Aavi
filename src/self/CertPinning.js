import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Certificate Pinning
// File: src/self/CertPinning.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';


const { NetworkSecurityModule } = NativeModules;

const DEFAULT_PINS = {
  'api.openai.com': ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
  'api.anthropic.com': ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='],
};

class CertPinning {
  constructor() {
    this.pins = { ...DEFAULT_PINS };
    this.enabled = true;
    this.violations = [];
  }

  async init() {
    await this.loadPins();
    await this.loadViolations();
    return true;
  }

  async loadPins() {
    try {
      const stored = await AsyncStorage.getItem('@manu_cert_pins');
      if (stored) {
        const custom = JSON.parse(stored);
        this.pins = { ...this.pins, ...custom };
      }
    } catch (e) {}
  }

  async savePins() {
    try {
      await AsyncStorage.setItem('@manu_cert_pins', JSON.stringify(this.pins));
    } catch (e) {}
  }

  async loadViolations() {
    try {
      const stored = await AsyncStorage.getItem('@manu_cert_violations');
      if (stored) this.violations = JSON.parse(stored);
    } catch (e) {}
  }

  async saveViolations() {
    try {
      await AsyncStorage.setItem('@manu_cert_violations', JSON.stringify(this.violations.slice(-100)));
    } catch (e) {}
  }

  async addPin(hostname, hashes) {
    if (!hostname || !Array.isArray(hashes) || hashes.length === 0) {
      return { success: false, error: 'Invalid hostname or hashes' };
    }
    this.pins[hostname] = hashes;
    await this.savePins();
    return { success: true };
  }

  async removePin(hostname) {
    delete this.pins[hostname];
    await this.savePins();
    return { success: true };
  }

  async verifyConnection(hostname, certificateChain) {
    if (!this.enabled) return { verified: true, reason: 'pinning_disabled' };
    if (!this.pins[hostname]) return { verified: true, reason: 'no_pin_configured' };

    const expectedHashes = this.pins[hostname];
    const actualHashes = certificateChain.map(cert => cert.sha256Pin || cert.sha256Fingerprint);
    const match = expectedHashes.some(expected => actualHashes.includes(expected));

    if (!match) {
      const violation = { timestamp: Date.now(), hostname, expectedHashes, actualHashes };
      this.violations.push(violation);
      await this.saveViolations();
      return { verified: false, reason: 'pin_mismatch', violation };
    }

    return { verified: true, reason: 'pin_matched' };
  }

  async enable() {
    this.enabled = true;
    await AsyncStorage.setItem('@manu_cert_pinning_enabled', 'true');
    return { enabled: true };
  }

  async disable() {
    this.enabled = false;
    await AsyncStorage.setItem('@manu_cert_pinning_enabled', 'false');
    return { enabled: false };
  }

  async isEnabled() {
    try {
      const val = await AsyncStorage.getItem('@manu_cert_pinning_enabled');
      return val !== 'false';
    } catch (e) { return true; }
  }

  getPins() {
    return { ...this.pins };
  }

  getViolations() {
    return [...this.violations];
  }

  async clearViolations() {
    this.violations = [];
    await AsyncStorage.removeItem('@manu_cert_violations');
  }

  async fetchAndPin(hostname) {
    try {
      const response = await fetch(`https://${hostname}`, { method: 'HEAD' });
      return { success: false, error: 'Certificate extraction requires native module' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export default new CertPinning();
