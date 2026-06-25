import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/CacheAI.js
// Generated: 2026-06-24
// Feature 110: Cache Intelligence — Smart cache, auto-clear old



const CACHE_PREFIX = '@manu_ai/cache_';
const CACHE_META_KEY = '@manu_ai/cache_metadata';
const DEFAULT_TTL_MS = 3600000; // 1 hour
const MAX_CACHE_SIZE_MB = 50;
const EVICTION_THRESHOLD_MB = 40;

class CacheAI {
  constructor() {
    this.cacheMeta = {};
    this.accessHistory = [];
    this.init();
  }

  async init() {
    await this.loadMeta();
    await this.performMaintenance();
  }

  async loadMeta() {
    try {
      const stored = await AsyncStorage.getItem(CACHE_META_KEY);
      this.cacheMeta = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.cacheMeta = {};
    }
  }

  async saveMeta() {
    try {
      await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(this.cacheMeta));
    } catch (e) {}
  }

  async set(key, value, options = {}) {
    const cacheKey = CACHE_PREFIX + key;
    const serialized = JSON.stringify(value);
    const sizeBytes = new Blob([serialized]).size || serialized.length * 2;
    const sizeMb = sizeBytes / (1024 * 1024);

    const entry = {
      value,
      createdAt: Date.now(),
      ttl: options.ttl || DEFAULT_TTL_MS,
      accessCount: 0,
      lastAccessed: Date.now(),
      sizeMb,
      priority: options.priority || 'normal', // critical, high, normal, low
      category: options.category || 'general',
    };

    // Check if we need to evict before adding
    await this.ensureSpace(sizeMb);

    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));

    this.cacheMeta[key] = {
      createdAt: entry.createdAt,
      ttl: entry.ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      sizeMb,
      priority: entry.priority,
      category: entry.category,
    };

    await this.saveMeta();
    return true;
  }

  async get(key) {
    const cacheKey = CACHE_PREFIX + key;

    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (!stored) return null;

      const entry = JSON.parse(stored);
      const now = Date.now();

      // Check TTL
      if (now - entry.createdAt > entry.ttl) {
        await this.remove(key);
        return null;
      }

      // Update access stats
      entry.accessCount += 1;
      entry.lastAccessed = now;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));

      if (this.cacheMeta[key]) {
        this.cacheMeta[key].accessCount += 1;
        this.cacheMeta[key].lastAccessed = now;
        await this.saveMeta();
      }

      this.accessHistory.push({ key, timestamp: now });
      if (this.accessHistory.length > 1000) {
        this.accessHistory = this.accessHistory.slice(-500);
      }

      return entry.value;
    } catch (e) {
      return null;
    }
  }

  async remove(key) {
    const cacheKey = CACHE_PREFIX + key;
    await AsyncStorage.removeItem(cacheKey);
    delete this.cacheMeta[key];
    await this.saveMeta();
  }

  async ensureSpace(requiredMb) {
    const totalSize = Object.values(this.cacheMeta).reduce((sum, meta) => sum + (meta.sizeMb || 0), 0);

    if (totalSize + requiredMb > EVICTION_THRESHOLD_MB) {
      await this.evictEntries(totalSize + requiredMb - EVICTION_THRESHOLD_MB);
    }
  }

  async evictEntries(targetMb) {
    let freed = 0;

    // Sort by priority (low first), then last accessed (oldest first), then access count (lowest first)
    const entries = Object.entries(this.cacheMeta).map(([key, meta]) => ({
      key,
      ...meta,
      priorityScore: this.getPriorityScore(meta.priority),
    }));

    entries.sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
      return a.lastAccessed - b.lastAccessed;
    });

    for (const entry of entries) {
      if (freed >= targetMb) break;
      await this.remove(entry.key);
      freed += entry.sizeMb || 0;
    }
  }

  getPriorityScore(priority) {
    const scores = { critical: 4, high: 3, normal: 2, low: 1 };
    return scores[priority] || 2;
  }

  async performMaintenance() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, meta] of Object.entries(this.cacheMeta)) {
      if (now - meta.createdAt > meta.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.remove(key);
    }

    // Also clear old access history
    const cutoff = now - 86400000; // 24 hours
    this.accessHistory = this.accessHistory.filter(a => a.timestamp > cutoff);
  }

  async getCacheStats() {
    const entries = Object.entries(this.cacheMeta);
    const totalSize = entries.reduce((sum, [, meta]) => sum + (meta.sizeMb || 0), 0);
    const byCategory = {};

    entries.forEach(([, meta]) => {
      const cat = meta.category || 'general';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, sizeMb: 0 };
      byCategory[cat].count += 1;
      byCategory[cat].sizeMb += meta.sizeMb || 0;
    });

    return {
      totalEntries: entries.length,
      totalSizeMb: totalSize,
      maxSizeMb: MAX_CACHE_SIZE_MB,
      thresholdMb: EVICTION_THRESHOLD_MB,
      byCategory,
      expiredCount: entries.filter(([, meta]) => Date.now() - meta.createdAt > meta.ttl).length,
    };
  }

  async clearCategory(category) {
    const keysToRemove = Object.entries(this.cacheMeta)
      .filter(([, meta]) => meta.category === category)
      .map(([key]) => key);

    for (const key of keysToRemove) {
      await this.remove(key);
    }

    return keysToRemove.length;
  }

  async clearAll() {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    this.cacheMeta = {};
    await AsyncStorage.removeItem(CACHE_META_KEY);
  }

  async getPopularKeys(limit = 20) {
    const entries = Object.entries(this.cacheMeta)
      .map(([key, meta]) => ({ key, accessCount: meta.accessCount || 0 }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }
}

export default new CacheAI();
