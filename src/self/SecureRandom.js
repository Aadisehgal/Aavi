// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Secure Random Generator
// File: src/self/SecureRandom.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';

const { CryptoModule } = NativeModules;

class SecureRandom {
  constructor() {
    this.fallbackWarningIssued = false;
  }

  async init() {
    return true;
  }

  async getRandomBytes(count) {
    if (count <= 0 || count > 65536) {
      throw new Error('Count must be between 1 and 65536');
    }

    try {
      if (CryptoModule && CryptoModule.getRandomBytes) {
        const result = await CryptoModule.getRandomBytes(count);
        if (result && typeof result === 'string') {
          return this.base64ToBytes(result);
        }
        return result;
      }
    } catch (e) {
      console.warn('Native secure random unavailable, using fallback');
      this.fallbackWarningIssued = true;
    }

    return this.fallbackRandomBytes(count);
  }

  async getRandomInt(min, max) {
    if (min >= max) throw new Error('min must be less than max');
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const mask = Math.pow(2, bytesNeeded * 8) - 1;

    let result;
    do {
      const bytes = await this.getRandomBytes(bytesNeeded);
      result = 0;
      for (let i = 0; i < bytesNeeded; i++) {
        result = (result << 8) + bytes[i];
      }
      result = result & mask;
    } while (result >= range);

    return min + result;
  }

  async getRandomHex(length) {
    const bytes = await this.getRandomBytes(Math.ceil(length / 2));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }

  async getRandomBase64(length) {
    const bytes = await this.getRandomBytes(Math.ceil(length * 3 / 4));
    return this.bytesToBase64(bytes).slice(0, length);
  }

  async getUUIDv4() {
    const bytes = await this.getRandomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  fallbackRandomBytes(count) {
    const bytes = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }

  base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  bytesToBase64(bytes) {
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  isFallbackActive() {
    return this.fallbackWarningIssued;
  }
}

export default new SecureRandom();
