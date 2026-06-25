// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — SD Card Intelligence
// File: src/self/SDCardIntel.js
// Generated: 2026-06-25

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { StorageModule, CryptoModule } = NativeModules;

class SDCardIntel {
  constructor() {
    this.cardInfo = null;
    this.encryptedPaths = new Set();
  }

  async init() {
    await this.loadEncryptedPaths();
    return true;
  }

  async loadEncryptedPaths() {
    try {
      const stored = await AsyncStorage.getItem('@manu_sd_encrypted_paths');
      if (stored) this.encryptedPaths = new Set(JSON.parse(stored));
    } catch (e) {}
  }

  async saveEncryptedPaths() {
    try {
      await AsyncStorage.setItem('@manu_sd_encrypted_paths', JSON.stringify([...this.encryptedPaths]));
    } catch (e) {}
  }

  async getSDCardInfo() {
    try {
      if (!StorageModule || !StorageModule.getExternalStorageInfo) {
        return { available: false, error: 'StorageModule unavailable' };
      }
      const info = await StorageModule.getExternalStorageInfo();
      this.cardInfo = info;
      return { available: true, ...info };
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  async listFiles(path = '') {
    try {
      if (!StorageModule || !StorageModule.listExternalFiles) {
        return { success: false, error: 'StorageModule unavailable' };
      }
      return await StorageModule.listExternalFiles(path);
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async encryptFile(filePath, keyAlias = 'manu_sd_key') {
    try {
      if (!StorageModule || !StorageModule.encryptExternalFile) {
        return { success: false, error: 'StorageModule unavailable' };
      }
      if (CryptoModule && CryptoModule.generateKey) {
        await CryptoModule.generateKey(256, keyAlias);
      }
      const result = await StorageModule.encryptExternalFile(filePath, keyAlias);
      if (result.success) {
        this.encryptedPaths.add(filePath);
        await this.saveEncryptedPaths();
      }
      return result;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async decryptFile(filePath, keyAlias = 'manu_sd_key') {
    try {
      if (!StorageModule || !StorageModule.decryptExternalFile) {
        return { success: false, error: 'StorageModule unavailable' };
      }
      return await StorageModule.decryptExternalFile(filePath, keyAlias);
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async secureDelete(filePath) {
    try {
      if (!StorageModule || !StorageModule.secureDeleteExternalFile) {
        return { success: false, error: 'StorageModule unavailable' };
      }
      const result = await StorageModule.secureDeleteExternalFile(filePath, 3);
      this.encryptedPaths.delete(filePath);
      await this.saveEncryptedPaths();
      return result;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async scanForThreats() {
    const threats = [];
    try {
      if (!StorageModule || !StorageModule.listExternalFiles) {
        return { threats, error: 'StorageModule unavailable' };
      }
      const files = await StorageModule.listExternalFiles('');
      if (!files.success) return { threats, error: files.error };
      const suspiciousExtensions = ['.apk', '.exe', '.bat', '.sh', '.py', '.js'];
      for (const file of files.files || []) {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (suspiciousExtensions.includes(ext)) {
          threats.push({ type: 'suspicious_file', severity: 'medium', file: file.name, path: file.path, reason: `Potentially executable file: ${ext}` });
        }
        if (file.name.startsWith('.')) {
          threats.push({ type: 'hidden_file', severity: 'low', file: file.name, path: file.path, reason: 'Hidden file detected' });
        }
      }
    } catch (e) {
      return { threats, error: e.message };
    }
    return { threats };
  }

  async getStorageStats() {
    try {
      if (!StorageModule || !StorageModule.getExternalStorageStats) {
        return { success: false, error: 'StorageModule unavailable' };
      }
      return await StorageModule.getExternalStorageStats();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async autoEncryptSensitive() {
    const encrypted = [];
    try {
      const files = await this.listFiles();
      if (!files.success) return { encrypted, error: files.error };
      const sensitivePatterns = ['password', 'secret', 'key', 'private', 'backup', 'wallet'];
      for (const file of files.files || []) {
        const lowerName = file.name.toLowerCase();
        if (sensitivePatterns.some(p => lowerName.includes(p)) && !this.encryptedPaths.has(file.path)) {
          const result = await this.encryptFile(file.path);
          if (result.success) encrypted.push(file.name);
        }
      }
    } catch (e) {
      return { encrypted, error: e.message };
    }
    return { encrypted };
  }

  getEncryptedPaths() {
    return [...this.encryptedPaths];
  }
}

export default new SDCardIntel();
