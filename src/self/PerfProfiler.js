import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/PerfProfiler.js
// Generated: 2026-06-24
// Feature 106: Performance Profiler — Slow operation detect, optimize

import { InteractionManager, Performance } from 'react-native';

const PERF_LOGS_KEY = '@manu_ai/perf_logs';
const SLOW_THRESHOLD_MS = 100;
const CRITICAL_THRESHOLD_MS = 500;
const MAX_LOGS = 200;

class PerfProfiler {
  constructor() {
    this.activeOperations = new Map();
    this.perfLogs = [];
    this.slowOperations = [];
    this.isEnabled = true;
    this.init();
  }

  async init() {
    await this.loadLogs();
  }

  async loadLogs() {
    try {
      const stored = await AsyncStorage.getItem(PERF_LOGS_KEY);
      this.perfLogs = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.perfLogs = [];
    }
  }

  async saveLogs() {
    try {
      const trimmed = this.perfLogs.slice(-MAX_LOGS);
      await AsyncStorage.setItem(PERF_LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  startOperation(operationName, metadata = {}) {
    if (!this.isEnabled) return null;

    const id = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const startTime = Performance.now ? Performance.now() : Date.now();

    this.activeOperations.set(id, {
      operationName,
      startTime,
      metadata,
      startDate: Date.now(),
    });

    return id;
  }

  endOperation(operationId) {
    if (!operationId || !this.isEnabled) return null;

    const op = this.activeOperations.get(operationId);
    if (!op) return null;

    const endTime = Performance.now ? Performance.now() : Date.now();
    const duration = endTime - op.startTime;

    this.activeOperations.delete(operationId);

    const logEntry = {
      id: operationId,
      operationName: op.operationName,
      duration,
      timestamp: Date.now(),
      metadata: op.metadata,
      severity: this.getSeverity(duration),
    };

    this.perfLogs.push(logEntry);

    if (duration >= SLOW_THRESHOLD_MS) {
      this.slowOperations.push(logEntry);
      this.analyzeSlowOperation(logEntry);
    }

    this.saveLogs();
    return logEntry;
  }

  getSeverity(duration) {
    if (duration >= CRITICAL_THRESHOLD_MS) return 'CRITICAL';
    if (duration >= SLOW_THRESHOLD_MS) return 'SLOW';
    return 'NORMAL';
  }

  analyzeSlowOperation(logEntry) {
    // Pattern detection for repeated slow operations
    const recent = this.perfLogs.filter(
      log => log.operationName === logEntry.operationName && log.severity !== 'NORMAL'
    );

    if (recent.length >= 3) {
      const avgDuration = recent.reduce((sum, log) => sum + log.duration, 0) / recent.length;
      const recommendation = this.generateRecommendation(logEntry.operationName, avgDuration);

      this.logOptimizationSuggestion({
        operationName: logEntry.operationName,
        avgDuration,
        occurrenceCount: recent.length,
        recommendation,
        timestamp: Date.now(),
      });
    }
  }

  generateRecommendation(operationName, avgDuration) {
    const recommendations = {
      'RENDER': 'Consider using React.memo or PureComponent to reduce re-renders.',
      'FETCH': 'Implement request caching or pagination to reduce network load.',
      'COMPUTE': 'Move heavy computation to a Web Worker or native module.',
      'PARSE': 'Optimize data parsing logic or use streaming parsers.',
      'SAVE': 'Batch AsyncStorage writes or use SQLite for large data.',
      'LOAD': 'Implement lazy loading or code splitting for large modules.',
      'ANIMATION': 'Use NativeDriver for animations and reduce JS thread load.',
    };

    for (const [key, value] of Object.entries(recommendations)) {
      if (operationName.toUpperCase().includes(key)) {
        return value;
      }
    }

    return `Operation ${operationName} is averaging ${avgDuration.toFixed(2)}ms. Consider optimizing the implementation.`;
  }

  async logOptimizationSuggestion(suggestion) {
    try {
      const key = '@manu_ai/optimization_suggestions';
      const stored = await AsyncStorage.getItem(key) || '[]';
      const suggestions = JSON.parse(stored);
      suggestions.push(suggestion);
      await AsyncStorage.setItem(key, JSON.stringify(suggestions.slice(-50)));
    } catch (e) {}
  }

  async getSlowOperations(limit = 50) {
    return this.slowOperations.slice(-limit);
  }

  async getPerfLogs(filter = {}) {
    let logs = [...this.perfLogs];

    if (filter.operationName) {
      logs = logs.filter(log => log.operationName === filter.operationName);
    }
    if (filter.severity) {
      logs = logs.filter(log => log.severity === filter.severity);
    }
    if (filter.since) {
      logs = logs.filter(log => log.timestamp >= filter.since);
    }

    return logs.slice(-(filter.limit || 100));
  }

  async getOptimizationSuggestions() {
    try {
      const stored = await AsyncStorage.getItem('@manu_ai/optimization_suggestions');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  getActiveOperations() {
    const now = Performance.now ? Performance.now() : Date.now();
    const active = [];
    for (const [id, op] of this.activeOperations.entries()) {
      active.push({
        id,
        operationName: op.operationName,
        elapsed: now - op.startTime,
        metadata: op.metadata,
      });
    }
    return active;
  }

  async clearLogs() {
    this.perfLogs = [];
    this.slowOperations = [];
    await AsyncStorage.removeItem(PERF_LOGS_KEY);
    await AsyncStorage.removeItem('@manu_ai/optimization_suggestions');
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Decorator-style wrapper for async functions
  async profileAsync(fn, operationName, metadata = {}) {
    const id = this.startOperation(operationName, metadata);
    try {
      const result = await fn();
      this.endOperation(id);
      return result;
    } catch (error) {
      this.endOperation(id);
      throw error;
    }
  }

  // Decorator-style wrapper for sync functions
  profileSync(fn, operationName, metadata = {}) {
    const id = this.startOperation(operationName, metadata);
    try {
      const result = fn();
      this.endOperation(id);
      return result;
    } catch (error) {
      this.endOperation(id);
      throw error;
    }
  }
}

export default new PerfProfiler();
