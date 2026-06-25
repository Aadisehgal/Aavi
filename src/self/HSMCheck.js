// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Hardware Security Module Check
// File: src/self/HSMCheck.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SecurityModule, DeviceInfo } = NativeModules;

class HSMCheck {
  constructor() {
    this.hsmInfo = null;
  }

  async init() {
    await this.checkHSM();
    return true;
  }

  async checkHSM() {
    const info = { hasStrongbox: false, hasTee: false, hasSE: false, secureElementVersion: null, teeVersion: null, recommendations: [], timestamp: Date.now() };

    try {
      if (Platform.OS !== 'android') {
        info.recommendations.push('HSM features are Android-specific');
        this.hsmInfo = info;
        return info;
      }

      if (SecurityModule && SecurityModule.getSecurityInfo) {
        const secInfo = await SecurityModule.getSecurityInfo();
        info.hasStrongbox = secInfo.hasStrongbox || false;
        info.hasTee = secInfo.hasTee || false;
        info.hasSE = secInfo.hasSecureElement || false;
        info.secureElementVersion = secInfo.secureElementVersion || null;
        info.teeVersion = secInfo.teeVersion || null;
      }

      if (SecurityModule && SecurityModule.canUseStrongbox) {
        info.hasStrongbox = await SecurityModule.canUseStrongbox();
      }

      if (info.hasStrongbox) {
        info.recommendations.push('StrongBox available: Use for highest security key storage');
      } else if (info.hasTee) {
        info.recommendations.push('TEE available: Use TEE-backed keystore for key storage');
      } else {
        info.recommendations.push('No hardware security detected: Keys stored in software Keystore');
        info.recommendations.push('Consider device upgrade for hardware-backed security');
      }

      if (info.hasSE) {
        info.recommendations.push('Secure Element detected: Suitable for payment-grade operations');
      }

    } catch (e) {
      info.recommendations.push('HSM check failed: ' + e.message);
    }

    this.hsmInfo = info;
    await AsyncStorage.setItem('@manu_hsm_info', JSON.stringify(info));
    return info;
  }

  async useStrongboxIfAvailable(keyAlias) {
    try {
      if (!this.hsmInfo) await this.checkHSM();
      if (this.hsmInfo.hasStrongbox && SecurityModule && SecurityModule.generateStrongboxKey) {
        return await SecurityModule.generateStrongboxKey(keyAlias);
      }
      return { success: false, reason: 'StrongBox unavailable' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async generateHardwareKey(alias, options = {}) {
    try {
      if (!this.hsmInfo) await this.checkHSM();
      const keyOptions = { alias, useStrongbox: this.hsmInfo.hasStrongbox && options.requireStrongbox !== false, useTee: this.hsmInfo.hasTee && !this.hsmInfo.hasStrongbox, size: options.size || 256, ...options };
      if (SecurityModule && SecurityModule.generateHardwareKey) {
        return await SecurityModule.generateHardwareKey(keyOptions);
      }
      return { success: false, error: 'SecurityModule unavailable' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getHSMInfo() {
    return this.hsmInfo ? { ...this.hsmInfo } : null;
  }

  async getLastCheck() {
    try {
      const stored = await AsyncStorage.getItem('@manu_hsm_info');
      return stored ? JSON.parse(stored) : null;
    } catch (e) { return null; }
  }
}

export default new HSMCheck();
