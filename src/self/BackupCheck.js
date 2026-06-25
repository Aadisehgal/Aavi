// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/BackupCheck.js
// Generated: 2026-06-24
// Feature 118: Backup Integrity Checker — Backup corrupt check, auto-fix

import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKUP_REGISTRY_KEY = '@manu_ai/backup_registry';
const INTEGRITY_LOG_KEY = '@manu_ai/integrity_log';

class BackupCheck {
  constructor() {
    this.backupRegistry = {};
    this.integrityLog = [];
    this.init();
  }

  async init() {
    await this.loadRegistry();
    await this.loadIntegrityLog();
  }

  async loadRegistry() {
    try {
      const stored = await AsyncStorage.getItem(BACKUP_REGISTRY_KEY);
      this.backupRegistry = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.backupRegistry = {};
    }
  }

  async saveRegistry() {
    try {
      await AsyncStorage.setItem(BACKUP_REGISTRY_KEY, JSON.stringify(this.backupRegistry));
    } catch (e) {}
  }

  async loadIntegrityLog() {
    try {
      const stored = await AsyncStorage.getItem(INTEGRITY_LOG_KEY);
      this.integrityLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.integrityLog = [];
    }
  }

  async saveIntegrityLog() {
    try {
      await AsyncStorage.setItem(INTEGRITY_LOG_KEY, JSON.stringify(this.integrityLog.slice(-100)));
    } catch (e) {}
  }

  async createBackup(backupId, data) {
    const checksum = this.calculateChecksum(data);
    const backupEntry = {
      id: backupId,
      createdAt: Date.now(),
      checksum,
      sizeBytes: JSON.stringify(data).length,
      version: '2.0.0',
      status: 'VALID',
    };

    this.backupRegistry[backupId] = backupEntry;
    await this.saveRegistry();

    // Store backup data
    try {
      await AsyncStorage.setItem(`@manu_ai/backup_${backupId}`, JSON.stringify(data));
    } catch (e) {}

    return backupEntry;
  }

  async verifyBackup(backupId) {
    const backup = this.backupRegistry[backupId];
    if (!backup) {
      return { valid: false, error: 'BACKUP_NOT_FOUND' };
    }

    try {
      const stored = await AsyncStorage.getItem(`@manu_ai/backup_${backupId}`);
      if (!stored) {
        return { valid: false, error: 'BACKUP_DATA_MISSING' };
      }

      const currentChecksum = this.calculateChecksum(JSON.parse(stored));
      const isValid = currentChecksum === backup.checksum;

      const checkEntry = {
        backupId,
        timestamp: Date.now(),
        isValid,
        expectedChecksum: backup.checksum,
        actualChecksum: currentChecksum,
      };

      this.integrityLog.push(checkEntry);
      await this.saveIntegrityLog();

      if (!isValid) {
        backup.status = 'CORRUPTED';
        await this.saveRegistry();

        // Attempt auto-fix
        const fixResult = await this.attemptAutoFix(backupId);
        return { valid: false, error: 'CHECKSUM_MISMATCH', fixResult };
      }

      backup.status = 'VALID';
      backup.lastVerified = Date.now();
      await this.saveRegistry();

      return { valid: true, backup };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async attemptAutoFix(backupId) {
    const strategies = [
      this.fixFromRedundantCopy.bind(this),
      this.fixFromPartialRebuild.bind(this),
      this.fixFromArchive.bind(this),
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy(backupId);
        if (result.success) {
          this.integrityLog.push({
            backupId,
            timestamp: Date.now(),
            event: 'AUTO_FIX_SUCCESS',
            strategy: result.strategy,
          });
          await this.saveIntegrityLog();
          return result;
        }
      } catch (e) {}
    }

    this.integrityLog.push({
      backupId,
      timestamp: Date.now(),
      event: 'AUTO_FIX_FAILED',
    });
    await this.saveIntegrityLog();

    return { success: false, strategy: 'ALL_FAILED' };
  }

  async fixFromRedundantCopy(backupId) {
    // Check if there is a redundant copy
    const redundantKey = `@manu_ai/backup_redundant_${backupId}`;
    try {
      const stored = await AsyncStorage.getItem(redundantKey);
      if (stored) {
        const data = JSON.parse(stored);
        await AsyncStorage.setItem(`@manu_ai/backup_${backupId}`, stored);
        const newChecksum = this.calculateChecksum(data);
        this.backupRegistry[backupId].checksum = newChecksum;
        this.backupRegistry[backupId].status = 'RECOVERED';
        await this.saveRegistry();
        return { success: true, strategy: 'REDUNDANT_COPY' };
      }
    } catch (e) {}
    return { success: false };
  }

  async fixFromPartialRebuild(backupId) {
    // Try to rebuild from component parts
    try {
      const keys = await AsyncStorage.getAllKeys();
      const componentKeys = keys.filter(k => k.startsWith(`@manu_ai/backup_component_${backupId}_`));
      if (componentKeys.length === 0) return { success: false };

      const components = {};
      for (const key of componentKeys) {
        const partName = key.replace(`@manu_ai/backup_component_${backupId}_`, '');
        const value = await AsyncStorage.getItem(key);
        components[partName] = value ? JSON.parse(value) : null;
      }

      const rebuilt = { _rebuilt: true, components };
      await AsyncStorage.setItem(`@manu_ai/backup_${backupId}`, JSON.stringify(rebuilt));
      this.backupRegistry[backupId].status = 'PARTIALLY_RECOVERED';
      await this.saveRegistry();
      return { success: true, strategy: 'PARTIAL_REBUILD' };
    } catch (e) {
      return { success: false };
    }
  }

  async fixFromArchive(backupId) {
    // Check archive for older valid version
    try {
      const archiveKey = `@manu_ai/archive_backup_${backupId}`;
      const stored = await AsyncStorage.getItem(archiveKey);
      if (stored) {
        await AsyncStorage.setItem(`@manu_ai/backup_${backupId}`, stored);
        const data = JSON.parse(stored);
        const newChecksum = this.calculateChecksum(data);
        this.backupRegistry[backupId].checksum = newChecksum;
        this.backupRegistry[backupId].status = 'ARCHIVE_RECOVERED';
        await this.saveRegistry();
        return { success: true, strategy: 'ARCHIVE_RECOVERY' };
      }
    } catch (e) {}
    return { success: false };
  }

  calculateChecksum(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char + (i * 7);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  async verifyAllBackups() {
    const results = [];
    for (const backupId of Object.keys(this.backupRegistry)) {
      const result = await this.verifyBackup(backupId);
      results.push({ backupId, ...result });
    }
    return results;
  }

  async getBackupStatus(backupId) {
    return this.backupRegistry[backupId] || null;
  }

  async getAllBackupStatuses() {
    return Object.values(this.backupRegistry);
  }

  async getIntegrityLog(limit = 50) {
    return this.integrityLog.slice(-limit);
  }

  async deleteBackup(backupId) {
    delete this.backupRegistry[backupId];
    await AsyncStorage.removeItem(`@manu_ai/backup_${backupId}`);
    await AsyncStorage.removeItem(`@manu_ai/backup_redundant_${backupId}`);
    await this.saveRegistry();
  }

  async clearAllData() {
    const keys = await AsyncStorage.getAllKeys();
    const backupKeys = keys.filter(k => k.startsWith('@manu_ai/backup_') || k.startsWith('@manu_ai/archive_backup_'));
    await AsyncStorage.multiRemove(backupKeys);
    this.backupRegistry = {};
    this.integrityLog = [];
    await AsyncStorage.removeItem(BACKUP_REGISTRY_KEY);
    await AsyncStorage.removeItem(INTEGRITY_LOG_KEY);
  }
}

export default new BackupCheck();
