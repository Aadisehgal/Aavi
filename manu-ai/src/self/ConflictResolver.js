// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/ConflictResolver.js
// Generated: 2026-06-24
// Feature 116: Sync Conflict Resolver — Multi-device sync conflict solve

import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFLICT_LOG_KEY = '@manu_ai/conflict_log';
const RESOLUTION_STRATEGY_KEY = '@manu_ai/conflict_strategy';

const STRATEGIES = {
  LAST_WRITE_WINS: 'last_write_wins',
  FIRST_WRITE_WINS: 'first_write_wins',
  SERVER_WINS: 'server_wins',
  CLIENT_WINS: 'client_wins',
  MERGE: 'merge',
  MANUAL: 'manual',
};

class ConflictResolver {
  constructor() {
    this.conflictLog = [];
    this.defaultStrategy = STRATEGIES.LAST_WRITE_WINS;
    this.resolutionCallbacks = new Map();
    this.init();
  }

  async init() {
    await this.loadConflictLog();
    await this.loadStrategy();
  }

  async loadConflictLog() {
    try {
      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      this.conflictLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.conflictLog = [];
    }
  }

  async saveConflictLog() {
    try {
      await AsyncStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify(this.conflictLog.slice(-100)));
    } catch (e) {}
  }

  async loadStrategy() {
    try {
      const stored = await AsyncStorage.getItem(RESOLUTION_STRATEGY_KEY);
      if (stored && Object.values(STRATEGIES).includes(stored)) {
        this.defaultStrategy = stored;
      }
    } catch (e) {}
  }

  async saveStrategy() {
    try {
      await AsyncStorage.setItem(RESOLUTION_STRATEGY_KEY, this.defaultStrategy);
    } catch (e) {}
  }

  setDefaultStrategy(strategy) {
    if (Object.values(STRATEGIES).includes(strategy)) {
      this.defaultStrategy = strategy;
      this.saveStrategy();
      return true;
    }
    return false;
  }

  getDefaultStrategy() {
    return this.defaultStrategy;
  }

  getAvailableStrategies() {
    return Object.entries(STRATEGIES).map(([key, value]) => ({ key, value }));
  }

  async detectConflict(localData, remoteData, dataType = 'generic') {
    if (!localData || !remoteData) return null;

    const localTimestamp = localData._timestamp || localData.updatedAt || 0;
    const remoteTimestamp = remoteData._timestamp || remoteData.updatedAt || 0;
    const localVersion = localData._version || localData.version || '0';
    const remoteVersion = remoteData._version || remoteData.version || '0';

    // Simple equality check
    const localString = JSON.stringify(this.stripMeta(localData));
    const remoteString = JSON.stringify(this.stripMeta(remoteData));

    if (localString === remoteString) {
      return null; // No conflict
    }

    // Version-based conflict detection
    if (localVersion === remoteVersion && localTimestamp === remoteTimestamp) {
      // Same version but different content - structural conflict
      return {
        type: 'STRUCTURAL',
        dataType,
        localData,
        remoteData,
        severity: 'HIGH',
      };
    }

    // Timestamp-based conflict
    if (localTimestamp !== remoteTimestamp) {
      return {
        type: 'TIMESTAMP',
        dataType,
        localData,
        remoteData,
        localTimestamp,
        remoteTimestamp,
        severity: 'MEDIUM',
      };
    }

    return {
      type: 'UNKNOWN',
      dataType,
      localData,
      remoteData,
      severity: 'LOW',
    };
  }

  stripMeta(data) {
    const stripped = { ...data };
    delete stripped._timestamp;
    delete stripped._version;
    delete stripped.updatedAt;
    delete stripped.createdAt;
    delete stripped._syncStatus;
    return stripped;
  }

  async resolveConflict(conflict, strategy = null) {
    const usedStrategy = strategy || this.defaultStrategy;
    const resolutionId = `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    let resolvedData;
    let winner;
    let resolutionType;

    switch (usedStrategy) {
      case STRATEGIES.LAST_WRITE_WINS:
        winner = conflict.localTimestamp > conflict.remoteTimestamp ? 'local' : 'remote';
        resolvedData = winner === 'local' ? conflict.localData : conflict.remoteData;
        resolutionType = 'AUTO_LAST_WRITE';
        break;

      case STRATEGIES.FIRST_WRITE_WINS:
        winner = conflict.localTimestamp < conflict.remoteTimestamp ? 'local' : 'remote';
        resolvedData = winner === 'local' ? conflict.localData : conflict.remoteData;
        resolutionType = 'AUTO_FIRST_WRITE';
        break;

      case STRATEGIES.SERVER_WINS:
        resolvedData = conflict.remoteData;
        winner = 'remote';
        resolutionType = 'AUTO_SERVER';
        break;

      case STRATEGIES.CLIENT_WINS:
        resolvedData = conflict.localData;
        winner = 'local';
        resolutionType = 'AUTO_CLIENT';
        break;

      case STRATEGIES.MERGE:
        resolvedData = await this.mergeData(conflict.localData, conflict.remoteData, conflict.dataType);
        winner = 'merged';
        resolutionType = 'AUTO_MERGE';
        break;

      case STRATEGIES.MANUAL:
      default:
        // Queue for manual resolution
        const logEntry = {
          id: resolutionId,
          timestamp: Date.now(),
          conflict,
          strategy: usedStrategy,
          status: 'PENDING_MANUAL',
        };
        this.conflictLog.push(logEntry);
        await this.saveConflictLog();
        return { status: 'PENDING_MANUAL', resolutionId, conflict };
    }

    const logEntry = {
      id: resolutionId,
      timestamp: Date.now(),
      conflict,
      strategy: usedStrategy,
      resolutionType,
      winner,
      resolvedData,
      status: 'RESOLVED',
    };

    this.conflictLog.push(logEntry);
    await this.saveConflictLog();

    return {
      status: 'RESOLVED',
      resolutionId,
      winner,
      data: resolvedData,
      strategy: usedStrategy,
    };
  }

  async mergeData(localData, remoteData, dataType) {
    if (Array.isArray(localData) && Array.isArray(remoteData)) {
      // Array merge: union by ID if objects, or simple concat with dedup
      const merged = [...localData];
      remoteData.forEach(remoteItem => {
        const exists = merged.some(localItem =>
          (localItem.id && localItem.id === remoteItem.id) ||
          JSON.stringify(localItem) === JSON.stringify(remoteItem)
        );
        if (!exists) merged.push(remoteItem);
      });
      return merged;
    }

    if (typeof localData === 'object' && typeof remoteData === 'object') {
      // Object merge: recursive merge
      const merged = { ...remoteData };
      for (const [key, value] of Object.entries(localData)) {
        if (merged[key] === undefined) {
          merged[key] = value;
        } else if (typeof value === 'object' && typeof merged[key] === 'object') {
          merged[key] = await this.mergeData(value, merged[key], dataType);
        } else if (value !== merged[key]) {
          // Keep both as array if scalar conflict
          merged[key] = [merged[key], value];
        }
      }
      return merged;
    }

    // Scalar conflict - return as array
    return [localData, remoteData];
  }

  async manualResolve(resolutionId, chosenData) {
    const entry = this.conflictLog.find(c => c.id === resolutionId);
    if (!entry || entry.status !== 'PENDING_MANUAL') return false;

    entry.status = 'RESOLVED';
    entry.resolvedData = chosenData;
    entry.winner = 'manual';
    entry.resolutionType = 'MANUAL';
    entry.resolvedAt = Date.now();

    await this.saveConflictLog();
    return { status: 'RESOLVED', resolutionId, data: chosenData };
  }

  async getPendingConflicts() {
    return this.conflictLog.filter(c => c.status === 'PENDING_MANUAL');
  }

  async getConflictHistory(limit = 50) {
    return this.conflictLog.slice(-limit);
  }

  async getConflictStats() {
    const total = this.conflictLog.length;
    const resolved = this.conflictLog.filter(c => c.status === 'RESOLVED').length;
    const pending = this.conflictLog.filter(c => c.status === 'PENDING_MANUAL').length;
    const byType = {};

    this.conflictLog.forEach(c => {
      const type = c.conflict?.type || 'UNKNOWN';
      if (!byType[type]) byType[type] = 0;
      byType[type] += 1;
    });

    return { total, resolved, pending, byType };
  }

  async clearConflictLog() {
    this.conflictLog = [];
    await AsyncStorage.removeItem(CONFLICT_LOG_KEY);
  }
}

export default new ConflictResolver();
