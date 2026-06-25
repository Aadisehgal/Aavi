import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/StorageAdvisor.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuStorageModule } = NativeModules;

const STORAGE_SCAN_KEY = '@manu_ai_storage_scan';
const CLEANUP_LOG_KEY = '@manu_ai_cleanup_log';

class StorageAdvisor {
  constructor() {
    this.lastScan = null;
    this.cleanupLog = [];
    this.maxLog = 50;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(STORAGE_SCAN_KEY);
      if (s) this.lastScan = JSON.parse(s);
      const l = await AsyncStorage.getItem(CLEANUP_LOG_KEY);
      if (l) this.cleanupLog = JSON.parse(l);
    } catch (e) {
      console.warn('StorageAdvisor load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(STORAGE_SCAN_KEY, JSON.stringify(this.lastScan));
      await AsyncStorage.setItem(CLEANUP_LOG_KEY, JSON.stringify(this.cleanupLog.slice(-this.maxLog)));
    } catch (e) {
      console.warn('StorageAdvisor save error:', e);
    }
  }

  async scanStorage() {
    let storageInfo;
    try {
      if (ManuStorageModule) {
        storageInfo = await ManuStorageModule.getStorageBreakdown();
      } else {
        storageInfo = this.getMockStorageInfo();
      }
    } catch (e) {
      storageInfo = this.getMockStorageInfo();
    }

    const analysis = this.analyzeStorage(storageInfo);
    this.lastScan = {
      timestamp: Date.now(),
      raw: storageInfo,
      analysis,
    };
    await this.saveData();
    return analysis;
  }

  getMockStorageInfo() {
    return {
      totalBytes: 128 * 1024 * 1024 * 1024,
      freeBytes: 20 * 1024 * 1024 * 1024,
      usedBytes: 108 * 1024 * 1024 * 1024,
      categories: {
        apps: 25 * 1024 * 1024 * 1024,
        photos: 35 * 1024 * 1024 * 1024,
        videos: 20 * 1024 * 1024 * 1024,
        audio: 8 * 1024 * 1024 * 1024,
        downloads: 12 * 1024 * 1024 * 1024,
        cache: 6 * 1024 * 1024 * 1024,
        system: 2 * 1024 * 1024 * 1024,
      },
      largeFiles: [],
      oldFiles: [],
      duplicateGroups: [],
    };
  }

  analyzeStorage(info) {
    const totalGB = info.totalBytes / (1024 * 1024 * 1024);
    const usedGB = info.usedBytes / (1024 * 1024 * 1024);
    const freeGB = info.freeBytes / (1024 * 1024 * 1024);
    const usagePercent = (usedGB / totalGB) * 100;

    const recommendations = [];
    const critical = usagePercent > 90;
    const warning = usagePercent > 75;

    if (critical) {
      recommendations.push({
        priority: 'critical',
        action: 'Immediate cleanup required. Less than 10% storage remaining.',
        potentialSavingsMB: 0,
      });
    }

    // Analyze categories
    const categories = [];
    for (const [name, bytes] of Object.entries(info.categories || {})) {
      const gb = bytes / (1024 * 1024 * 1024);
      const percent = (gb / usedGB) * 100;
      categories.push({ name, sizeGB: parseFloat(gb.toFixed(2)), percent: parseFloat(percent.toFixed(1)) });

      if (name === 'cache' && gb > 1) {
        recommendations.push({
          priority: 'high',
          action: `Clear app cache (~${gb.toFixed(1)} GB recoverable)`,
          potentialSavingsMB: Math.round(gb * 1024),
          category: 'cache',
        });
      }
      if (name === 'downloads' && gb > 2) {
        recommendations.push({
          priority: 'medium',
          action: `Review Downloads folder (~${gb.toFixed(1)} GB). Delete old files.`,
          potentialSavingsMB: Math.round(gb * 1024),
          category: 'downloads',
        });
      }
      if (name === 'photos' && gb > 10) {
        recommendations.push({
          priority: 'medium',
          action: `Optimize photos: ${gb.toFixed(1)} GB. Consider cloud backup and local deletion.`,
          potentialSavingsMB: Math.round(gb * 512), // Assume 50% compressible
          category: 'photos',
        });
      }
      if (name === 'videos' && gb > 5) {
        recommendations.push({
          priority: 'medium',
          action: `Review videos: ${gb.toFixed(1)} GB. Delete or compress old recordings.`,
          potentialSavingsMB: Math.round(gb * 1024),
          category: 'videos',
        });
      }
    }

    // Large files
    const largeFiles = (info.largeFiles || []).map(f => ({
      path: f.path,
      sizeMB: Math.round(f.size / (1024 * 1024)),
      lastModified: f.lastModified,
    }));

    if (largeFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: `Found ${largeFiles.length} large files. Review for deletion.`,
        potentialSavingsMB: largeFiles.reduce((sum, f) => sum + f.sizeMB, 0),
        category: 'large_files',
      });
    }

    // Duplicates
    const duplicates = info.duplicateGroups || [];
    if (duplicates.length > 0) {
      const dupSavings = duplicates.reduce((sum, group) => {
        const sorted = group.sort((a, b) => b.size - a.size);
        return sum + sorted.slice(1).reduce((s, f) => s + f.size, 0);
      }, 0);
      recommendations.push({
        priority: 'low',
        action: `Found ${duplicates.length} duplicate file groups.`,
        potentialSavingsMB: Math.round(dupSavings / (1024 * 1024)),
        category: 'duplicates',
      });
    }

    // Old files (> 6 months)
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const oldFiles = (info.oldFiles || []).filter(f => f.lastModified < sixMonthsAgo);
    if (oldFiles.length > 10) {
      recommendations.push({
        priority: 'low',
        action: `Found ${oldFiles.length} files unused for 6+ months.`,
        potentialSavingsMB: Math.round(oldFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)),
        category: 'old_files',
      });
    }

    recommendations.sort((a, b) => {
      const prio = { critical: 0, high: 1, medium: 2, low: 3 };
      return prio[a.priority] - prio[b.priority];
    });

    return {
      totalGB: parseFloat(totalGB.toFixed(2)),
      usedGB: parseFloat(usedGB.toFixed(2)),
      freeGB: parseFloat(freeGB.toFixed(2)),
      usagePercent: parseFloat(usagePercent.toFixed(1)),
      status: critical ? 'critical' : warning ? 'warning' : 'healthy',
      categories: categories.sort((a, b) => b.sizeGB - a.sizeGB),
      largeFiles: largeFiles.slice(0, 20),
      duplicateGroups: duplicates.length,
      oldFileCount: oldFiles.length,
      recommendations,
      totalRecoverableMB: recommendations.reduce((sum, r) => sum + (r.potentialSavingsMB || 0), 0),
    };
  }

  async executeCleanup(recommendation) {
    try {
      if (ManuStorageModule && recommendation.category) {
        await ManuStorageModule.clearCategory(recommendation.category);
      }
      this.cleanupLog.push({
        action: recommendation.action,
        category: recommendation.category,
        savedMB: recommendation.potentialSavingsMB,
        timestamp: Date.now(),
      });
      if (this.cleanupLog.length > this.maxLog) this.cleanupLog.shift();
      await this.saveData();
      return true;
    } catch (e) {
      console.warn('Cleanup failed:', e);
      return false;
    }
  }

  getCleanupLog() {
    return this.cleanupLog;
  }

  getLastScan() {
    return this.lastScan;
  }
}

export default new StorageAdvisor();
