import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/DBOptimize.js
// Generated: 2026-06-24
// Feature 111: Database Optimization — SQLite vacuum, index optimize

import { NativeModules } from 'react-native';

const DB_STATS_KEY = '@manu_ai/db_stats';
const OPTIMIZATION_LOG_KEY = '@manu_ai/db_optimization_log';
const { ManuNativeBridge } = NativeModules;

class DBOptimize {
  constructor() {
    this.dbStats = {};
    this.optimizationLog = [];
    this.isOptimizing = false;
    this.init();
  }

  async init() {
    await this.loadStats();
    await this.loadOptimizationLog();
  }

  async loadStats() {
    try {
      const stored = await AsyncStorage.getItem(DB_STATS_KEY);
      this.dbStats = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.dbStats = {};
    }
  }

  async saveStats() {
    try {
      await AsyncStorage.setItem(DB_STATS_KEY, JSON.stringify(this.dbStats));
    } catch (e) {}
  }

  async loadOptimizationLog() {
    try {
      const stored = await AsyncStorage.getItem(OPTIMIZATION_LOG_KEY);
      this.optimizationLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.optimizationLog = [];
    }
  }

  async saveOptimizationLog() {
    try {
      await AsyncStorage.setItem(OPTIMIZATION_LOG_KEY, JSON.stringify(this.optimizationLog.slice(-100)));
    } catch (e) {}
  }

  async analyzeDatabase() {
    const stats = {
      timestamp: Date.now(),
      tables: [],
      totalSize: 0,
      fragmentation: 0,
      indexHealth: [],
      recommendations: [],
    };

    try {
      if (ManuNativeBridge && ManuNativeBridge.getDatabaseStats) {
        const nativeStats = await ManuNativeBridge.getDatabaseStats();
        stats.tables = nativeStats.tables || [];
        stats.totalSize = nativeStats.totalSize || 0;
        stats.fragmentation = nativeStats.fragmentation || 0;
        stats.indexHealth = nativeStats.indexHealth || [];
      }
    } catch (e) {
      stats.error = e.message;
    }

    // Generate recommendations
    if (stats.fragmentation > 30) {
      stats.recommendations.push({
        type: 'VACUUM',
        priority: 'HIGH',
        message: `Database fragmentation is ${stats.fragmentation}%. VACUUM recommended.`,
      });
    }

    if (stats.tables) {
      stats.tables.forEach(table => {
        if (table.rowCount > 10000 && !table.hasIndex) {
          stats.recommendations.push({
            type: 'ADD_INDEX',
            priority: 'MEDIUM',
            table: table.name,
            message: `Table ${table.name} has ${table.rowCount} rows without proper indexing.`,
          });
        }

        if (table.deletedRows && table.deletedRows > table.rowCount * 0.2) {
          stats.recommendations.push({
            type: 'CLEANUP',
            priority: 'MEDIUM',
            table: table.name,
            message: `Table ${table.name} has many deleted rows. Cleanup recommended.`,
          });
        }
      });
    }

    this.dbStats = stats;
    await this.saveStats();
    return stats;
  }

  async vacuumDatabase() {
    if (this.isOptimizing) return { success: false, error: 'Optimization already in progress' };
    this.isOptimizing = true;

    const startTime = Date.now();
    let result = { success: false };

    try {
      if (ManuNativeBridge && ManuNativeBridge.vacuumDatabase) {
        await ManuNativeBridge.vacuumDatabase();
        result = { success: true, duration: Date.now() - startTime };
      } else {
        result = { success: false, error: 'Native vacuum not available' };
      }
    } catch (e) {
      result = { success: false, error: e.message };
    } finally {
      this.isOptimizing = false;
    }

    this.optimizationLog.push({
      timestamp: Date.now(),
      operation: 'VACUUM',
      result,
    });
    await this.saveOptimizationLog();

    return result;
  }

  async optimizeIndexes() {
    if (this.isOptimizing) return { success: false, error: 'Optimization already in progress' };
    this.isOptimizing = true;

    const startTime = Date.now();
    let result = { success: false, indexesOptimized: 0 };

    try {
      if (ManuNativeBridge && ManuNativeBridge.optimizeIndexes) {
        const nativeResult = await ManuNativeBridge.optimizeIndexes();
        result = {
          success: true,
          indexesOptimized: nativeResult.indexesOptimized || 0,
          duration: Date.now() - startTime,
        };
      } else {
        result = { success: false, error: 'Native index optimization not available' };
      }
    } catch (e) {
      result = { success: false, error: e.message };
    } finally {
      this.isOptimizing = false;
    }

    this.optimizationLog.push({
      timestamp: Date.now(),
      operation: 'INDEX_OPTIMIZE',
      result,
    });
    await this.saveOptimizationLog();

    return result;
  }

  async cleanupDeletedRows() {
    if (this.isOptimizing) return { success: false, error: 'Optimization already in progress' };
    this.isOptimizing = true;

    const startTime = Date.now();
    let result = { success: false, rowsCleaned: 0 };

    try {
      if (ManuNativeBridge && ManuNativeBridge.cleanupDeletedRows) {
        const nativeResult = await ManuNativeBridge.cleanupDeletedRows();
        result = {
          success: true,
          rowsCleaned: nativeResult.rowsCleaned || 0,
          duration: Date.now() - startTime,
        };
      } else {
        result = { success: false, error: 'Native cleanup not available' };
      }
    } catch (e) {
      result = { success: false, error: e.message };
    } finally {
      this.isOptimizing = false;
    }

    this.optimizationLog.push({
      timestamp: Date.now(),
      operation: 'CLEANUP',
      result,
    });
    await this.saveOptimizationLog();

    return result;
  }

  async runFullOptimization() {
    const results = {
      vacuum: null,
      indexes: null,
      cleanup: null,
      timestamp: Date.now(),
    };

    results.vacuum = await this.vacuumDatabase();
    if (results.vacuum.success) {
      results.indexes = await this.optimizeIndexes();
      results.cleanup = await this.cleanupDeletedRows();
    }

    return results;
  }

  async getStats() {
    return this.dbStats;
  }

  async getOptimizationLog(limit = 50) {
    return this.optimizationLog.slice(-limit);
  }

  async scheduleAutoOptimize(intervalHours = 168) { // Weekly default
    const key = '@manu_ai/db_auto_optimize';
    const config = {
      enabled: true,
      intervalHours,
      lastRun: 0,
      nextRun: Date.now() + intervalHours * 3600000,
    };
    await AsyncStorage.setItem(key, JSON.stringify(config));
  }

  async checkAutoOptimize() {
    try {
      const stored = await AsyncStorage.getItem('@manu_ai/db_auto_optimize');
      if (!stored) return;

      const config = JSON.parse(stored);
      if (!config.enabled) return;

      if (Date.now() >= config.nextRun) {
        await this.runFullOptimization();
        config.lastRun = Date.now();
        config.nextRun = Date.now() + config.intervalHours * 3600000;
        await AsyncStorage.setItem('@manu_ai/db_auto_optimize', JSON.stringify(config));
      }
    } catch (e) {}
  }

  async clearLogs() {
    this.optimizationLog = [];
    await AsyncStorage.removeItem(OPTIMIZATION_LOG_KEY);
  }
}

export default new DBOptimize();
