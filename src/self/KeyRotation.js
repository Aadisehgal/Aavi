import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Encryption Key Rotation
// File: src/self/KeyRotation.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';


const { CryptoModule } = NativeModules;

const KEY_VERSION_PREFIX = '@manu_key_v';
const ROTATION_INTERVAL_DAYS = 90;

class KeyRotation {
  constructor() {
    this.currentVersion = 0;
    this.rotationSchedule = null;
  }

  async init() {
    await this.loadKeyVersion();
    this.scheduleRotation();
    return true;
  }

  async loadKeyVersion() {
    try {
      const v = await AsyncStorage.getItem('@manu_key_current_version');
      this.currentVersion = v ? parseInt(v) : 0;
    } catch (e) { this.currentVersion = 0; }
  }

  async saveKeyVersion() {
    try {
      await AsyncStorage.setItem('@manu_key_current_version', String(this.currentVersion));
    } catch (e) {}
  }

  scheduleRotation() {
    // In production, use BackgroundTask or AlarmManager
  }

  async shouldRotate() {
    try {
      const lastRotated = await AsyncStorage.getItem('@manu_key_last_rotated');
      if (!lastRotated) return true;
      const daysSince = (Date.now() - parseInt(lastRotated)) / 86400000;
      return daysSince >= ROTATION_INTERVAL_DAYS;
    } catch (e) { return false; }
  }

  async rotateKeys() {
    const report = { timestamp: Date.now(), success: false, reencrypted: 0, errors: [] };

    try {
      if (!CryptoModule || !CryptoModule.generateKey) {
        report.errors.push('CryptoModule unavailable');
        return report;
      }

      const newVersion = this.currentVersion + 1;
      const newKey = await CryptoModule.generateKey(256);
      const keyName = `${KEY_VERSION_PREFIX}${newVersion}`;
      await AsyncStorage.setItem(keyName, newKey);

      const reencrypted = await this.reencryptData(newKey);
      report.reencrypted = reencrypted.count;
      report.errors.push(...reencrypted.errors);

      if (this.currentVersion > 0) {
        const oldKeyName = `${KEY_VERSION_PREFIX}${this.currentVersion}`;
        await this.secureDelete(oldKeyName);
      }

      this.currentVersion = newVersion;
      await this.saveKeyVersion();
      await AsyncStorage.setItem('@manu_key_last_rotated', String(Date.now()));

      report.success = true;
      report.newVersion = newVersion;
    } catch (e) {
      report.errors.push(e.message);
    }

    await AsyncStorage.setItem('@manu_key_rotation_log', JSON.stringify(report));
    return report;
  }

  async reencryptData(newKey) {
    const sensitiveKeys = [
      '@manu_encrypted_notes',
      '@manu_secure_vault',
      '@manu_api_keys',
      '@manu_backup_keys',
    ];

    let count = 0;
    const errors = [];

    for (const key of sensitiveKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;

        let decrypted;
        if (CryptoModule && CryptoModule.decryptWithCurrentKey) {
          decrypted = await CryptoModule.decryptWithCurrentKey(raw);
        } else {
          decrypted = raw;
        }

        let encrypted;
        if (CryptoModule && CryptoModule.encryptWithKey) {
          encrypted = await CryptoModule.encryptWithKey(decrypted, newKey);
        } else {
          encrypted = decrypted;
        }

        await AsyncStorage.setItem(key, encrypted);
        count++;
      } catch (e) {
        errors.push(`${key}: ${e.message}`);
      }
    }

    return { count, errors };
  }

  async secureDelete(keyName) {
    try {
      const raw = await AsyncStorage.getItem(keyName);
      if (raw) {
        const zeros = '0'.repeat(raw.length);
        await AsyncStorage.setItem(keyName, zeros);
      }
      await AsyncStorage.removeItem(keyName);
    } catch (e) {}
  }

  async getKeyStatus() {
    const lastRotated = await AsyncStorage.getItem('@manu_key_last_rotated');
    return {
      currentVersion: this.currentVersion,
      lastRotated: lastRotated ? parseInt(lastRotated) : null,
      nextRotationDue: lastRotated ? parseInt(lastRotated) + ROTATION_INTERVAL_DAYS * 86400000 : null,
      shouldRotate: await this.shouldRotate(),
    };
  }

  async getRotationHistory() {
    try {
      const log = await AsyncStorage.getItem('@manu_key_rotation_log');
      return log ? JSON.parse(log) : null;
    } catch (e) { return null; }
  }
}

export default new KeyRotation();
