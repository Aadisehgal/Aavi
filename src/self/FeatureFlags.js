import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/FeatureFlags.js
// Generated: 2026-06-24
// Feature 120: Feature Flag System — A/B test, gradual rollout



const FEATURE_FLAGS_KEY = '@manu_ai/feature_flags';
const USER_ASSIGNMENTS_KEY = '@manu_ai/feature_assignments';
const ROLLOUT_LOG_KEY = '@manu_ai/rollout_log';

class FeatureFlags {
  constructor() {
    this.flags = {};
    this.userAssignments = {};
    this.rolloutLog = [];
    this.init();
  }

  async init() {
    await this.loadFlags();
    await this.loadUserAssignments();
    await this.loadRolloutLog();
  }

  async loadFlags() {
    try {
      const stored = await AsyncStorage.getItem(FEATURE_FLAGS_KEY);
      this.flags = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.flags = {};
    }
  }

  async saveFlags() {
    try {
      await AsyncStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(this.flags));
    } catch (e) {}
  }

  async loadUserAssignments() {
    try {
      const stored = await AsyncStorage.getItem(USER_ASSIGNMENTS_KEY);
      this.userAssignments = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.userAssignments = {};
    }
  }

  async saveUserAssignments() {
    try {
      await AsyncStorage.setItem(USER_ASSIGNMENTS_KEY, JSON.stringify(this.userAssignments));
    } catch (e) {}
  }

  async loadRolloutLog() {
    try {
      const stored = await AsyncStorage.getItem(ROLLOUT_LOG_KEY);
      this.rolloutLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.rolloutLog = [];
    }
  }

  async saveRolloutLog() {
    try {
      await AsyncStorage.setItem(ROLLOUT_LOG_KEY, JSON.stringify(this.rolloutLog.slice(-200)));
    } catch (e) {}
  }

  defineFlag(flagName, config) {
    this.flags[flagName] = {
      name: flagName,
      enabled: config.enabled !== false,
      rolloutPercentage: config.rolloutPercentage || 0, // 0-100
      allowedUsers: config.allowedUsers || [],
      blockedUsers: config.blockedUsers || [],
      requiresVersion: config.requiresVersion || null,
      startDate: config.startDate || null,
      endDate: config.endDate || null,
      variants: config.variants || null, // For A/B testing
      defaultValue: config.defaultValue !== undefined ? config.defaultValue : true,
      description: config.description || '',
      createdAt: Date.now(),
    };
    this.saveFlags();
  }

  async isEnabled(flagName, userId = null) {
    const flag = this.flags[flagName];
    if (!flag) return false;

    // Check if explicitly disabled
    if (!flag.enabled) return flag.defaultValue;

    // Check date bounds
    const now = Date.now();
    if (flag.startDate && now < flag.startDate) return flag.defaultValue;
    if (flag.endDate && now > flag.endDate) return flag.defaultValue;

    // Check user allowlist/blocklist
    if (userId) {
      if (flag.blockedUsers.includes(userId)) return flag.defaultValue;
      if (flag.allowedUsers.includes(userId)) return true;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const assignment = await this.getUserAssignment(flagName, userId);
      if (!assignment.inRollout) {
        return flag.defaultValue;
      }
    }

    // Check version requirement
    if (flag.requiresVersion) {
      const currentVersion = '2.0.0'; // Would be dynamic
      if (!this.versionSatisfies(currentVersion, flag.requiresVersion)) {
        return flag.defaultValue;
      }
    }

    return true;
  }

  async getVariant(flagName, userId = null) {
    const flag = this.flags[flagName];
    if (!flag || !flag.variants) return null;

    const assignment = await this.getUserAssignment(flagName, userId);
    return assignment.variant || flag.variants[0];
  }

  async getUserAssignment(flagName, userId) {
    const key = `${flagName}_${userId || 'anonymous'}`;

    if (this.userAssignments[key]) {
      return this.userAssignments[key];
    }

    const flag = this.flags[flagName];
    const hash = this.hashString(key);
    const inRollout = (hash % 100) < (flag?.rolloutPercentage || 0);

    let variant = null;
    if (flag?.variants && flag.variants.length > 0) {
      const variantIndex = hash % flag.variants.length;
      variant = flag.variants[variantIndex];
    }

    const assignment = { inRollout, variant, assignedAt: Date.now() };
    this.userAssignments[key] = assignment;
    await this.saveUserAssignments();

    this.rolloutLog.push({
      flagName,
      userId: userId || 'anonymous',
      assignedAt: Date.now(),
      inRollout,
      variant,
    });
    await this.saveRolloutLog();

    return assignment;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  versionSatisfies(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const c = currentParts[i] || 0;
      const r = requiredParts[i] || 0;
      if (c < r) return false;
      if (c > r) return true;
    }
    return true;
  }

  setRolloutPercentage(flagName, percentage) {
    if (this.flags[flagName]) {
      this.flags[flagName].rolloutPercentage = Math.max(0, Math.min(100, percentage));
      this.saveFlags();
      return true;
    }
    return false;
  }

  enableFlag(flagName) {
    if (this.flags[flagName]) {
      this.flags[flagName].enabled = true;
      this.saveFlags();
      return true;
    }
    return false;
  }

  disableFlag(flagName) {
    if (this.flags[flagName]) {
      this.flags[flagName].enabled = false;
      this.saveFlags();
      return true;
    }
    return false;
  }

  getFlagStatus(flagName) {
    return this.flags[flagName] || null;
  }

  getAllFlags() {
    return Object.values(this.flags);
  }

  async getRolloutStats(flagName) {
    const relevant = this.rolloutLog.filter(r => r.flagName === flagName);
    const total = relevant.length;
    const inRollout = relevant.filter(r => r.inRollout).length;

    const variantCounts = {};
    relevant.forEach(r => {
      if (r.variant) {
        if (!variantCounts[r.variant]) variantCounts[r.variant] = 0;
        variantCounts[r.variant] += 1;
      }
    });

    return {
      flagName,
      totalAssignments: total,
      inRolloutCount: inRollout,
      rolloutRate: total > 0 ? (inRollout / total).toFixed(2) : '0',
      variantDistribution: variantCounts,
    };
  }

  async clearAssignments() {
    this.userAssignments = {};
    await AsyncStorage.removeItem(USER_ASSIGNMENTS_KEY);
  }

  async clearRolloutLog() {
    this.rolloutLog = [];
    await AsyncStorage.removeItem(ROLLOUT_LOG_KEY);
  }
}

export default new FeatureFlags();
