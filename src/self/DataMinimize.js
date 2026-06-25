import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Data Minimization Engine
// File: src/self/DataMinimize.js
// Generated: 2026-06-25



const RETENTION_POLICIES = {
  '@manu_voice_logs': 7,
  '@manu_command_history': 30,
  '@manu_notification_log': 14,
  '@manu_screenshot_cache': 3,
  '@manu_temp_files': 1,
  '@manu_network_logs': 7,
  '@manu_error_logs': 14,
  '@manu_audit_history': 90,
  '@manu_perm_log': 30,
  '@manu_health_cache': 7,
  '@manu_location_history': 30,
  '@manu_chat_history': 30,
};

class DataMinimize {
  constructor() {
    this.lastRun = null;
    this.stats = { deleted: 0, preserved: 0, bytesFreed: 0 };
  }

  async init() {
    await this.loadLastRun();
    return true;
  }

  async loadLastRun() {
    try {
      const stored = await AsyncStorage.getItem('@manu_minimize_last_run');
      if (stored) this.lastRun = parseInt(stored);
    } catch (e) {}
  }

  async saveLastRun() {
    try {
      await AsyncStorage.setItem('@manu_minimize_last_run', String(Date.now()));
    } catch (e) {}
  }

  async runMinimization() {
    this.stats = { deleted: 0, preserved: 0, bytesFreed: 0 };
    const now = Date.now();
    const results = [];

    for (const [key, days] of Object.entries(RETENTION_POLICIES)) {
      const result = await this.minimizeKey(key, days, now);
      results.push(result);
    }

    await this.cleanUnknownKeys(now);

    this.lastRun = now;
    await this.saveLastRun();
    await AsyncStorage.setItem('@manu_minimize_stats', JSON.stringify(this.stats));

    return { timestamp: now, stats: this.stats, details: results };
  }

  async minimizeKey(key, days, now) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { key, action: 'none', reason: 'empty' };

      let data;
      try { data = JSON.parse(raw); } catch (e) { data = raw; }

      const cutoff = now - days * 86400000;

      if (Array.isArray(data)) {
        const originalLen = data.length;
        const filtered = data.filter(item => {
          if (!item || typeof item !== 'object') return true;
          const ts = item.timestamp || item.createdAt || item.time;
          return !ts || ts > cutoff;
        });
        const deleted = originalLen - filtered.length;
        if (deleted > 0) {
          await AsyncStorage.setItem(key, JSON.stringify(filtered));
          this.stats.deleted += deleted;
          this.stats.bytesFreed += (raw.length - JSON.stringify(filtered).length);
          return { key, action: 'trimmed', deleted, remaining: filtered.length };
        }
      } else if (data && typeof data === 'object' && data.timestamp) {
        if (data.timestamp < cutoff) {
          await AsyncStorage.removeItem(key);
          this.stats.deleted += 1;
          this.stats.bytesFreed += raw.length;
          return { key, action: 'deleted', reason: 'expired' };
        }
      }

      this.stats.preserved += 1;
      return { key, action: 'preserved', reason: 'within_policy' };
    } catch (e) {
      return { key, action: 'error', reason: e.message };
    }
  }

  async cleanUnknownKeys(now) {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const unknownKeys = allKeys.filter(k => k.startsWith('@manu_') && !RETENTION_POLICIES[k]);
      const cutoff = now - 30 * 86400000;

      for (const key of unknownKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          let data;
          try { data = JSON.parse(raw); } catch (e) { data = null; }
          const ts = data && typeof data === 'object' ? (data.timestamp || data.lastRun) : null;
          if (!ts || ts < cutoff) {
            await AsyncStorage.removeItem(key);
            this.stats.deleted += 1;
            this.stats.bytesFreed += raw.length;
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  async getStats() {
    try {
      const stored = await AsyncStorage.getItem('@manu_minimize_stats');
      return stored ? JSON.parse(stored) : this.stats;
    } catch (e) { return this.stats; }
  }

  async scheduleDaily() {
    const last = this.lastRun || 0;
    if (Date.now() - last > 86400000) {
      return await this.runMinimization();
    }
    return { skipped: true, reason: 'Already run within 24h' };
  }

  getRetentionPolicy() {
    return { ...RETENTION_POLICIES };
  }

  async setRetentionPolicy(key, days) {
    if (RETENTION_POLICIES.hasOwnProperty(key)) {
      RETENTION_POLICIES[key] = days;
      await AsyncStorage.setItem('@manu_custom_retention', JSON.stringify(RETENTION_POLICIES));
      return { success: true };
    }
    return { success: false, error: 'Unknown key' };
  }
}

export default new DataMinimize();
