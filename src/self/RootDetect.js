// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Root Detection (Honest)
// File: src/self/RootDetect.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SecurityModule } = NativeModules;

class RootDetect {
  constructor() {
    this.lastCheck = null;
    this.honestMessageShown = false;
  }

  async init() {
    await this.loadState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_root_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.honestMessageShown = state.honestMessageShown || false;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_root_state', JSON.stringify({ honestMessageShown: this.honestMessageShown }));
    } catch (e) {}
  }

  async detectRoot() {
    const result = { detected: false, methods: [], riskLevel: 'none', honestMessage: '', timestamp: Date.now() };

    try {
      if (SecurityModule && SecurityModule.isRooted) {
        const rooted = await SecurityModule.isRooted();
        if (rooted) {
          result.detected = true;
          result.methods.push('native_check');
        }
      }
    } catch (e) {}

    const rootPaths = [
      '/system/bin/su', '/system/xbin/su', '/sbin/su', '/su/bin/su',
      '/data/local/xbin/su', '/data/local/bin/su', '/system/sd/xbin/su',
      '/system/app/Superuser.apk', '/magisk',
    ];

    try {
      if (SecurityModule && SecurityModule.fileExists) {
        for (const path of rootPaths) {
          const exists = await SecurityModule.fileExists(path);
          if (exists) {
            result.detected = true;
            result.methods.push(`file_exists:${path}`);
          }
        }
      }
    } catch (e) {}

    try {
      if (SecurityModule && SecurityModule.getBuildTags) {
        const tags = await SecurityModule.getBuildTags();
        if (tags && tags.includes('test-keys')) {
          result.detected = true;
          result.methods.push('test-keys');
        }
      }
    } catch (e) {}

    if (result.detected) {
      result.riskLevel = result.methods.length > 2 ? 'high' : 'medium';
      result.honestMessage = this.getHonestMessage(result.riskLevel);
    }

    this.lastCheck = result;
    await AsyncStorage.setItem('@manu_root_last_check', JSON.stringify(result));
    return result;
  }

  getHonestMessage(riskLevel) {
    const messages = {
      medium: `Root access detected on your device. MANU AI will continue to work normally, but please be aware that rooted devices have a higher security risk. Malicious apps with root access can bypass Android's security sandbox. We recommend using MANU AI's Security Audit feature regularly.`,
      high: `Strong root indicators detected. Your device security model is significantly weakened. MANU AI will continue to function, but we strongly advise: (1) Only grant root to apps you absolutely trust, (2) Keep your root manager (Magisk/SuperSU) updated, (3) Enable Magisk Hide if available, (4) Run MANU AI's Local Security Audit weekly.`,
    };
    return messages[riskLevel] || '';
  }

  async shouldShowHonestMessage() {
    if (this.honestMessageShown) return false;
    const check = await this.detectRoot();
    return check.detected;
  }

  async markMessageShown() {
    this.honestMessageShown = true;
    await this.saveState();
  }

  getLastCheck() {
    return this.lastCheck;
  }
}

export default new RootDetect();
