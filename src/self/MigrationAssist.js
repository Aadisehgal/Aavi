import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/MigrationAssist.js
// Generated: 2026-06-24
// Feature 117: Data Migration Assistant — New phone pe data transfer

import { NativeModules } from 'react-native';

const MIGRATION_STATE_KEY = '@manu_ai/migration_state';
const MIGRATION_LOG_KEY = '@manu_ai/migration_log';

class MigrationAssist {
  constructor() {
    this.migrationState = {};
    this.migrationLog = [];
    this.init();
  }

  async init() {
    await this.loadState();
    await this.loadLog();
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem(MIGRATION_STATE_KEY);
      this.migrationState = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.migrationState = {};
    }
  }

  async saveState() {
    try {
      await AsyncStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(this.migrationState));
    } catch (e) {}
  }

  async loadLog() {
    try {
      const stored = await AsyncStorage.getItem(MIGRATION_LOG_KEY);
      this.migrationLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.migrationLog = [];
    }
  }

  async saveLog() {
    try {
      await AsyncStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(this.migrationLog.slice(-100)));
    } catch (e) {}
  }

  async exportData() {
    const startTime = Date.now();
    const exportPackage = {
      version: '2.0.0',
      exportedAt: Date.now(),
      deviceInfo: await this.getDeviceInfo(),
      data: {},
    };

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const manuKeys = allKeys.filter(k => k.startsWith('@manu_ai/'));

      for (const key of manuKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          exportPackage.data[key] = value;
        } catch (e) {
          exportPackage.data[key] = null;
        }
      }

      const sizeBytes = JSON.stringify(exportPackage).length;
      exportPackage.sizeBytes = sizeBytes;
      exportPackage.sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);

      this.logEvent('EXPORT_COMPLETED', {
        duration: Date.now() - startTime,
        keyCount: manuKeys.length,
        sizeMb: exportPackage.sizeMb,
      });

      return {
        success: true,
        package: exportPackage,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logEvent('EXPORT_FAILED', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async importData(exportPackage, options = {}) {
    const startTime = Date.now();

    if (!exportPackage || !exportPackage.data) {
      return { success: false, error: 'Invalid export package' };
    }

    // Validate version compatibility
    if (exportPackage.version !== '2.0.0' && !options.force) {
      return {
        success: false,
        error: `Version mismatch: ${exportPackage.version} vs 2.0.0`,
        suggestion: 'Use force option to override',
      };
    }

    const results = {
      imported: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    try {
      if (options.clearExisting) {
        const existingKeys = await AsyncStorage.getAllKeys();
        const manuKeys = existingKeys.filter(k => k.startsWith('@manu_ai/'));
        await AsyncStorage.multiRemove(manuKeys);
      }

      for (const [key, value] of Object.entries(exportPackage.data)) {
        if (value === null) {
          results.skipped += 1;
          continue;
        }

        try {
          await AsyncStorage.setItem(key, value);
          results.imported += 1;
        } catch (e) {
          results.failed += 1;
          results.details.push({ key, error: e.message });
        }
      }

      this.migrationState.lastImport = {
        timestamp: Date.now(),
        sourceVersion: exportPackage.version,
        results,
      };
      await this.saveState();

      this.logEvent('IMPORT_COMPLETED', {
        duration: Date.now() - startTime,
        ...results,
      });

      return {
        success: true,
        results,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logEvent('IMPORT_FAILED', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async generateMigrationQR() {
    // Generate a compact representation for QR transfer
    const exportResult = await this.exportData();
    if (!exportResult.success) return exportResult;

    // For QR, we need to compress significantly - just export critical data
    const criticalKeys = Object.keys(exportResult.package.data).filter(k =>
      k.includes('settings') || k.includes('profile') || k.includes('config')
    );

    const qrPackage = {
      version: '2.0.0',
      type: 'QR_MIGRATION',
      criticalData: {},
      checksum: '',
    };

    criticalKeys.forEach(key => {
      qrPackage.criticalData[key] = exportResult.package.data[key];
    });

    qrPackage.checksum = this.simpleChecksum(JSON.stringify(qrPackage.criticalData));

    return {
      success: true,
      qrPackage,
      sizeEstimate: JSON.stringify(qrPackage).length,
    };
  }

  simpleChecksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  async getDeviceInfo() {
    const info = {
      platform: 'unknown',
      osVersion: 'unknown',
      appVersion: '2.0.0',
    };

    try {
      if (NativeModules.ManuNativeBridge && NativeModules.ManuNativeBridge.getDeviceInfo) {
        const nativeInfo = await NativeModules.ManuNativeBridge.getDeviceInfo();
        return { ...info, ...nativeInfo };
      }
    } catch (e) {}

    return info;
  }

  async getMigrationStatus() {
    return {
      lastExport: this.migrationState.lastExport || null,
      lastImport: this.migrationState.lastImport || null,
      isMigrating: this.migrationState.isMigrating || false,
    };
  }

  logEvent(eventType, data) {
    const entry = {
      eventType,
      timestamp: Date.now(),
      data,
    };
    this.migrationLog.push(entry);
    this.saveLog();
  }

  async getMigrationLog(limit = 50) {
    return this.migrationLog.slice(-limit);
  }

  async clearMigrationData() {
    this.migrationState = {};
    this.migrationLog = [];
    await AsyncStorage.removeItem(MIGRATION_STATE_KEY);
    await AsyncStorage.removeItem(MIGRATION_LOG_KEY);
  }
}

export default new MigrationAssist();
