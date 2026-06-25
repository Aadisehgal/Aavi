// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Secure Erase Protocol
// File: src/self/SecureErase.js
// Generated: 2026-06-25

import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { FileSystemModule, CryptoModule } = NativeModules;

const OVERWRITE_PASSES = 3;
const PATTERNS = ['0', '1', 'R'];

class SecureErase {
  constructor() {
    this.eraseLog = [];
  }

  async init() {
    await this.loadLog();
    return true;
  }

  async loadLog() {
    try {
      const stored = await AsyncStorage.getItem('@manu_erase_log');
      if (stored) this.eraseLog = JSON.parse(stored);
    } catch (e) {}
  }

  async saveLog() {
    try {
      await AsyncStorage.setItem('@manu_erase_log', JSON.stringify(this.eraseLog.slice(-100)));
    } catch (e) {}
  }

  async secureEraseAsyncStorage(key) {
    const report = { key, timestamp: Date.now(), method: 'async_storage', passes: 0, success: false };
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        report.success = true;
        report.note = 'Key did not exist';
        this.eraseLog.push(report);
        await this.saveLog();
        return report;
      }

      const len = raw.length;
      for (let i = 0; i < OVERWRITE_PASSES; i++) {
        const pattern = PATTERNS[i % PATTERNS.length];
        let overwrite;
        if (pattern === 'R') {
          overwrite = await this.randomString(len);
        } else {
          overwrite = pattern.repeat(len);
        }
        await AsyncStorage.setItem(key, overwrite);
        report.passes++;
      }

      await AsyncStorage.removeItem(key);
      report.success = true;
    } catch (e) {
      report.error = e.message;
    }

    this.eraseLog.push(report);
    await this.saveLog();
    return report;
  }

  async secureEraseFile(filePath) {
    const report = { path: filePath, timestamp: Date.now(), method: 'file', passes: 0, success: false };
    try {
      if (!FileSystemModule || !FileSystemModule.fileExists) {
        report.error = 'FileSystemModule unavailable';
        this.eraseLog.push(report);
        await this.saveLog();
        return report;
      }

      const exists = await FileSystemModule.fileExists(filePath);
      if (!exists) {
        report.success = true;
        report.note = 'File did not exist';
        this.eraseLog.push(report);
        await this.saveLog();
        return report;
      }

      const info = await FileSystemModule.getFileInfo(filePath);
      const size = info.size || 1024;

      for (let i = 0; i < OVERWRITE_PASSES; i++) {
        const pattern = PATTERNS[i % PATTERNS.length];
        let overwriteData;
        if (pattern === 'R') {
          overwriteData = await this.randomBuffer(size);
        } else {
          overwriteData = pattern.repeat(size);
        }
        await FileSystemModule.writeFile(filePath, overwriteData);
        report.passes++;
      }

      await FileSystemModule.deleteFile(filePath);
      report.success = true;
    } catch (e) {
      report.error = e.message;
    }

    this.eraseLog.push(report);
    await this.saveLog();
    return report;
  }

  async secureEraseAll() {
    const report = { timestamp: Date.now(), items: [], overall: false };
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const manuKeys = allKeys.filter(k => k.startsWith('@manu_'));

      for (const key of manuKeys) {
        const itemReport = await this.secureEraseAsyncStorage(key);
        report.items.push(itemReport);
      }

      if (FileSystemModule && FileSystemModule.getCacheDir) {
        const cacheDir = await FileSystemModule.getCacheDir();
        const files = await FileSystemModule.listFiles(cacheDir);
        for (const file of files) {
          const fileReport = await this.secureEraseFile(file);
          report.items.push(fileReport);
        }
      }

      report.overall = report.items.every(i => i.success);
    } catch (e) {
      report.error = e.message;
    }

    await AsyncStorage.setItem('@manu_erase_all_report', JSON.stringify(report));
    return report;
  }

  async randomString(length) {
    try {
      if (CryptoModule && CryptoModule.getRandomBytes) {
        const bytes = await CryptoModule.getRandomBytes(length);
        return bytes.toString('base64').slice(0, length);
      }
    } catch (e) {}
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async randomBuffer(size) {
    try {
      if (CryptoModule && CryptoModule.getRandomBytes) {
        return await CryptoModule.getRandomBytes(size);
      }
    } catch (e) {}
    return 'R'.repeat(size);
  }

  getEraseLog() {
    return [...this.eraseLog];
  }
}

export default new SecureErase();
