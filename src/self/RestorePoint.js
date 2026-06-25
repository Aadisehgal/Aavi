// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/RestorePoint.js
// Generated: 2026-06-24
// Feature 119: Restore Point Manager — System restore point create

import AsyncStorage from '@react-native-async-storage/async-storage';

const RESTORE_POINTS_KEY = '@manu_ai/restore_points';
const MAX_RESTORE_POINTS = 10;

class RestorePoint {
  constructor() {
    this.restorePoints = [];
    this.init();
  }

  async init() {
    await this.loadRestorePoints();
  }

  async loadRestorePoints() {
    try {
      const stored = await AsyncStorage.getItem(RESTORE_POINTS_KEY);
      this.restorePoints = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.restorePoints = [];
    }
  }

  async saveRestorePoints() {
    try {
      const trimmed = this.restorePoints.slice(-MAX_RESTORE_POINTS);
      await AsyncStorage.setItem(RESTORE_POINTS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  async createRestorePoint(description = '') {
    const pointId = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const manuKeys = allKeys.filter(k => k.startsWith('@manu_ai/'));
      const snapshot = {};

      for (const key of manuKeys) {
        try {
          // Skip restore points themselves to avoid recursion
          if (key === RESTORE_POINTS_KEY) continue;
          const value = await AsyncStorage.getItem(key);
          snapshot[key] = value;
        } catch (e) {
          snapshot[key] = null;
        }
      }

      const sizeBytes = JSON.stringify(snapshot).length;

      const restorePoint = {
        id: pointId,
        createdAt: Date.now(),
        description: description || `Auto restore point ${new Date().toLocaleString()}`,
        snapshot,
        sizeBytes,
        sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
        keyCount: manuKeys.length,
        isAuto: !description,
      };

      this.restorePoints.push(restorePoint);

      // Remove oldest if exceeding max
      if (this.restorePoints.length > MAX_RESTORE_POINTS) {
        this.restorePoints = this.restorePoints.slice(-MAX_RESTORE_POINTS);
      }

      await this.saveRestorePoints();

      return {
        success: true,
        restorePoint: {
          id: restorePoint.id,
          createdAt: restorePoint.createdAt,
          description: restorePoint.description,
          sizeMb: restorePoint.sizeMb,
          keyCount: restorePoint.keyCount,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async restoreToPoint(pointId) {
    const point = this.restorePoints.find(p => p.id === pointId);
    if (!point) {
      return { success: false, error: 'RESTORE_POINT_NOT_FOUND' };
    }

    try {
      // Create current backup before restoring
      const currentBackupId = `pre_restore_${Date.now()}`;
      await this.createRestorePoint(`Auto-backup before restore to ${pointId}`);

      // Apply snapshot
      const snapshot = point.snapshot;
      for (const [key, value] of Object.entries(snapshot)) {
        if (value === null) {
          await AsyncStorage.removeItem(key);
        } else {
          await AsyncStorage.setItem(key, value);
        }
      }

      return {
        success: true,
        restoredPoint: pointId,
        keysRestored: Object.keys(snapshot).length,
        timestamp: Date.now(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteRestorePoint(pointId) {
    const idx = this.restorePoints.findIndex(p => p.id === pointId);
    if (idx === -1) return false;

    this.restorePoints.splice(idx, 1);
    await this.saveRestorePoints();
    return true;
  }

  async getRestorePoints() {
    return this.restorePoints.map(p => ({
      id: p.id,
      createdAt: p.createdAt,
      description: p.description,
      sizeMb: p.sizeMb,
      keyCount: p.keyCount,
      isAuto: p.isAuto,
    }));
  }

  async getRestorePointDetails(pointId) {
    const point = this.restorePoints.find(p => p.id === pointId);
    if (!point) return null;

    // Show key categories without full data
    const keyCategories = {};
    Object.keys(point.snapshot).forEach(key => {
      const category = key.split('/')[2] || 'other';
      if (!keyCategories[category]) keyCategories[category] = 0;
      keyCategories[category] += 1;
    });

    return {
      id: point.id,
      createdAt: point.createdAt,
      description: point.description,
      sizeMb: point.sizeMb,
      keyCount: point.keyCount,
      keyCategories,
    };
  }

  async compareRestorePoints(pointId1, pointId2) {
    const p1 = this.restorePoints.find(p => p.id === pointId1);
    const p2 = this.restorePoints.find(p => p.id === pointId2);

    if (!p1 || !p2) return null;

    const keys1 = new Set(Object.keys(p1.snapshot));
    const keys2 = new Set(Object.keys(p2.snapshot));

    const added = [...keys2].filter(k => !keys1.has(k));
    const removed = [...keys1].filter(k => !keys2.has(k));
    const common = [...keys1].filter(k => keys2.has(k));

    const modified = [];
    for (const key of common) {
      if (p1.snapshot[key] !== p2.snapshot[key]) {
        modified.push(key);
      }
    }

    return {
      point1: pointId1,
      point2: pointId2,
      added: added.length,
      removed: removed.length,
      modified: modified.length,
      addedKeys: added,
      removedKeys: removed,
      modifiedKeys: modified,
    };
  }

  async clearAllRestorePoints() {
    this.restorePoints = [];
    await AsyncStorage.removeItem(RESTORE_POINTS_KEY);
  }

  async autoCreateIfNeeded() {
    // Create auto restore point if none exist or last is older than 24 hours
    if (this.restorePoints.length === 0) {
      return await this.createRestorePoint();
    }

    const lastPoint = this.restorePoints[this.restorePoints.length - 1];
    if (Date.now() - lastPoint.createdAt > 86400000) {
      return await this.createRestorePoint();
    }

    return null;
  }
}

export default new RestorePoint();
