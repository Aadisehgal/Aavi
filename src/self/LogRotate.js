import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/LogRotate.js
// Generated: 2026-06-24
// Feature 112: Log Rotation Manager — Old logs archive, compress, delete



const LOG_ARCHIVE_KEY = '@manu_ai/log_archive';
const ROTATION_CONFIG_KEY = '@manu_ai/log_rotation_config';
const DEFAULT_CONFIG = {
  maxLogAgeDays: 30,
  maxArchiveSizeMb: 100,
  archiveFormat: 'json', // json, compressed
  rotationIntervalHours: 24,
  compressAfterDays: 7,
  deleteAfterDays: 30,
};

class LogRotate {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.archiveIndex = [];
    this.init();
  }

  async init() {
    await this.loadConfig();
    await this.loadArchiveIndex();
    await this.performRotation();
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem(ROTATION_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem(ROTATION_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {}
  }

  async loadArchiveIndex() {
    try {
      const stored = await AsyncStorage.getItem(LOG_ARCHIVE_KEY);
      this.archiveIndex = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.archiveIndex = [];
    }
  }

  async saveArchiveIndex() {
    try {
      await AsyncStorage.setItem(LOG_ARCHIVE_KEY, JSON.stringify(this.archiveIndex));
    } catch (e) {}
  }

  async performRotation() {
    const now = Date.now();
    const keys = await AsyncStorage.getAllKeys();
    const logKeys = keys.filter(k => k.startsWith('@manu_ai/') && (
      k.includes('_logs') || k.includes('_log') || k.includes('crash') || k.includes('perf')
    ));

    for (const key of logKeys) {
      await this.rotateLogKey(key);
    }

    await this.cleanupOldArchives();
  }

  async rotateLogKey(key) {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return;

      const logs = JSON.parse(stored);
      if (!Array.isArray(logs) || logs.length === 0) return;

      const now = Date.now();
      const cutoff = now - (this.config.maxLogAgeDays * 86400000);
      const compressCutoff = now - (this.config.compressAfterDays * 86400000);

      const recentLogs = logs.filter(log => (log.timestamp || 0) > cutoff);
      const oldLogs = logs.filter(log => (log.timestamp || 0) <= cutoff);
      const compressLogs = logs.filter(log => (log.timestamp || 0) <= compressCutoff && (log.timestamp || 0) > cutoff);

      // Keep only recent logs in active storage
      if (recentLogs.length !== logs.length) {
        await AsyncStorage.setItem(key, JSON.stringify(recentLogs));
      }

      // Archive old logs
      if (oldLogs.length > 0) {
        await this.archiveLogs(key, oldLogs, 'delete');
      }

      // Compress medium-aged logs
      if (compressLogs.length > 0 && this.config.archiveFormat === 'compressed') {
        await this.archiveLogs(key, compressLogs, 'compress');
      }
    } catch (e) {}
  }

  async archiveLogs(sourceKey, logs, action) {
    const archiveEntry = {
      id: `archive_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sourceKey,
      timestamp: Date.now(),
      logCount: logs.length,
      action,
      sizeBytes: JSON.stringify(logs).length,
    };

    if (action === 'compress') {
      // Simple compression: store as single string with minimal formatting
      const compressed = JSON.stringify(logs);
      const archiveKey = `@manu_ai/archive_${archiveEntry.id}`;
      await AsyncStorage.setItem(archiveKey, compressed);
      archiveEntry.archiveKey = archiveKey;
    }

    this.archiveIndex.push(archiveEntry);
    await this.saveArchiveIndex();
  }

  async cleanupOldArchives() {
    const now = Date.now();
    const deleteCutoff = now - (this.config.deleteAfterDays * 86400000);

    const toDelete = this.archiveIndex.filter(a => a.timestamp < deleteCutoff);
    const remaining = this.archiveIndex.filter(a => a.timestamp >= deleteCutoff);

    for (const entry of toDelete) {
      if (entry.archiveKey) {
        await AsyncStorage.removeItem(entry.archiveKey);
      }
    }

    this.archiveIndex = remaining;
    await this.saveArchiveIndex();

    // Check total archive size
    await this.enforceSizeLimit();
  }

  async enforceSizeLimit() {
    const totalSize = this.archiveIndex.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    const totalSizeMb = totalSize / (1024 * 1024);

    if (totalSizeMb > this.config.maxArchiveSizeMb) {
      // Sort by timestamp (oldest first) and remove until under limit
      const sorted = [...this.archiveIndex].sort((a, b) => a.timestamp - b.timestamp);
      let currentSize = totalSize;

      for (const entry of sorted) {
        if (currentSize <= this.config.maxArchiveSizeMb * 1024 * 1024) break;

        if (entry.archiveKey) {
          await AsyncStorage.removeItem(entry.archiveKey);
        }
        currentSize -= entry.sizeBytes || 0;
        const idx = this.archiveIndex.findIndex(a => a.id === entry.id);
        if (idx !== -1) this.archiveIndex.splice(idx, 1);
      }

      await this.saveArchiveIndex();
    }
  }

  async getArchiveStats() {
    const totalSize = this.archiveIndex.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    const byAction = {};

    this.archiveIndex.forEach(entry => {
      if (!byAction[entry.action]) byAction[entry.action] = { count: 0, sizeBytes: 0 };
      byAction[entry.action].count += 1;
      byAction[entry.action].sizeBytes += entry.sizeBytes || 0;
    });

    return {
      totalArchives: this.archiveIndex.length,
      totalSizeBytes: totalSize,
      totalSizeMb: (totalSize / (1024 * 1024)).toFixed(2),
      maxSizeMb: this.config.maxArchiveSizeMb,
      byAction,
    };
  }

  async retrieveArchive(archiveId) {
    const entry = this.archiveIndex.find(a => a.id === archiveId);
    if (!entry || !entry.archiveKey) return null;

    try {
      const stored = await AsyncStorage.getItem(entry.archiveKey);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  async getArchiveList() {
    return this.archiveIndex.map(entry => ({
      id: entry.id,
      sourceKey: entry.sourceKey,
      timestamp: entry.timestamp,
      logCount: entry.logCount,
      action: entry.action,
      sizeBytes: entry.sizeBytes,
    }));
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  async getConfig() {
    return { ...this.config };
  }

  async clearAllArchives() {
    for (const entry of this.archiveIndex) {
      if (entry.archiveKey) {
        await AsyncStorage.removeItem(entry.archiveKey);
      }
    }
    this.archiveIndex = [];
    await this.saveArchiveIndex();
  }
}

export default new LogRotate();
