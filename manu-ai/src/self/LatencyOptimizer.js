import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/LatencyOptimizer.js
// Generated: 2026-06-24
// Feature 109: Network Latency Optimizer — Slow connection se best path

import { NetInfo } from 'react-native';

const LATENCY_LOGS_KEY = '@manu_ai/latency_logs';
const ENDPOINT_STATS_KEY = '@manu_ai/endpoint_stats';
const MAX_LOGS = 200;
const SLOW_LATENCY_MS = 500;
const CRITICAL_LATENCY_MS = 2000;

class LatencyOptimizer {
  constructor() {
    this.latencyLogs = [];
    this.endpointStats = new Map();
    this.connectionType = 'unknown';
    this.isConnected = true;
    this.init();
  }

  async init() {
    await this.loadLogs();
    await this.loadEndpointStats();
    this.startConnectionMonitoring();
  }

  async loadLogs() {
    try {
      const stored = await AsyncStorage.getItem(LATENCY_LOGS_KEY);
      this.latencyLogs = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.latencyLogs = [];
    }
  }

  async saveLogs() {
    try {
      const trimmed = this.latencyLogs.slice(-MAX_LOGS);
      await AsyncStorage.setItem(LATENCY_LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  async loadEndpointStats() {
    try {
      const stored = await AsyncStorage.getItem(ENDPOINT_STATS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.endpointStats = new Map(Object.entries(parsed));
      }
    } catch (e) {
      this.endpointStats = new Map();
    }
  }

  async saveEndpointStats() {
    try {
      const obj = Object.fromEntries(this.endpointStats);
      await AsyncStorage.setItem(ENDPOINT_STATS_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  startConnectionMonitoring() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      this.connectionType = state.type;
      this.isConnected = state.isConnected;
    });
  }

  async measureLatency(endpoint, options = {}) {
    const startTime = Date.now();
    let success = false;
    let error = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

      const response = await fetch(endpoint, {
        method: options.method || 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
        headers: { 'X-Latency-Check': '1' },
      });

      clearTimeout(timeout);
      success = response.ok;
    } catch (e) {
      error = e.message;
      success = false;
    }

    const latency = Date.now() - startTime;

    const logEntry = {
      id: `latency_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      endpoint,
      latency,
      success,
      error,
      connectionType: this.connectionType,
      timestamp: Date.now(),
      method: options.method || 'HEAD',
    };

    this.latencyLogs.push(logEntry);
    await this.saveLogs();
    await this.updateEndpointStats(endpoint, latency, success);

    return {
      latency,
      success,
      error,
      quality: this.classifyLatency(latency),
    };
  }

  async updateEndpointStats(endpoint, latency, success) {
    const stats = this.endpointStats.get(endpoint) || {
      totalRequests: 0,
      successfulRequests: 0,
      totalLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      lastChecked: 0,
      failureCount: 0,
    };

    stats.totalRequests += 1;
    if (success) {
      stats.successfulRequests += 1;
      stats.totalLatency += latency;
      stats.minLatency = Math.min(stats.minLatency, latency);
      stats.maxLatency = Math.max(stats.maxLatency, latency);
    } else {
      stats.failureCount += 1;
    }
    stats.lastChecked = Date.now();

    this.endpointStats.set(endpoint, stats);
    await this.saveEndpointStats();
  }

  classifyLatency(latency) {
    if (latency < 100) return 'EXCELLENT';
    if (latency < SLOW_LATENCY_MS) return 'GOOD';
    if (latency < CRITICAL_LATENCY_MS) return 'SLOW';
    return 'CRITICAL';
  }

  async findBestEndpoint(endpoints) {
    const results = [];

    for (const endpoint of endpoints) {
      const stats = this.endpointStats.get(endpoint);
      if (stats && stats.totalRequests > 5) {
        const avgLatency = stats.totalLatency / stats.successfulRequests;
        const successRate = stats.successfulRequests / stats.totalRequests;
        results.push({ endpoint, avgLatency, successRate, fromCache: true });
      } else {
        const measurement = await this.measureLatency(endpoint, { timeout: 5000 });
        results.push({
          endpoint,
          avgLatency: measurement.latency,
          successRate: measurement.success ? 1 : 0,
          fromCache: false,
        });
      }
    }

    // Sort by success rate first, then latency
    results.sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return a.avgLatency - b.avgLatency;
    });

    return results;
  }

  async optimizeRequest(url, options = {}) {
    const measurement = await this.measureLatency(url, { method: 'HEAD', timeout: 3000 });

    if (measurement.quality === 'CRITICAL' || !measurement.success) {
      // Try fallback strategies
      if (this.connectionType === 'cellular') {
        return {
          optimized: true,
          strategy: 'REDUCE_PAYLOAD',
          recommendation: 'Use compressed data and smaller payloads on cellular.',
          useCache: true,
        };
      }

      return {
        optimized: true,
        strategy: 'RETRY_WITH_BACKOFF',
        recommendation: 'Network is slow. Implementing exponential backoff.',
        retryDelay: 2000,
      };
    }

    if (measurement.quality === 'SLOW') {
      return {
        optimized: true,
        strategy: 'BATCH_REQUESTS',
        recommendation: 'Batch multiple requests to reduce overhead.',
      };
    }

    return {
      optimized: false,
      latency: measurement.latency,
      quality: measurement.quality,
    };
  }

  async getEndpointStats(endpoint) {
    return this.endpointStats.get(endpoint) || null;
  }

  async getAllEndpointStats() {
    return Object.fromEntries(this.endpointStats);
  }

  async getLatencyLogs(filter = {}) {
    let logs = [...this.latencyLogs];
    if (filter.endpoint) {
      logs = logs.filter(l => l.endpoint === filter.endpoint);
    }
    if (filter.quality) {
      logs = logs.filter(l => this.classifyLatency(l.latency) === filter.quality);
    }
    return logs.slice(-(filter.limit || 100));
  }

  async getNetworkQualityReport() {
    const recent = this.latencyLogs.slice(-50);
    if (recent.length === 0) return { status: 'NO_DATA' };

    const avgLatency = recent.reduce((sum, l) => sum + l.latency, 0) / recent.length;
    const successRate = recent.filter(l => l.success).length / recent.length;
    const slowCount = recent.filter(l => l.latency > SLOW_LATENCY_MS).length;

    return {
      status: 'ANALYZED',
      averageLatency: avgLatency,
      successRate,
      slowRequestRatio: slowCount / recent.length,
      connectionType: this.connectionType,
      isConnected: this.isConnected,
      quality: this.classifyLatency(avgLatency),
      recommendation: this.generateNetworkRecommendation(avgLatency, successRate),
    };
  }

  generateNetworkRecommendation(avgLatency, successRate) {
    if (successRate < 0.5) return 'Network connectivity is poor. Enable offline mode.';
    if (avgLatency > CRITICAL_LATENCY_MS) return 'Very high latency. Use cached data when possible.';
    if (avgLatency > SLOW_LATENCY_MS) return 'Moderate latency. Batch requests and compress payloads.';
    if (avgLatency < 100) return 'Excellent network conditions. Full functionality available.';
    return 'Good network conditions.';
  }

  async clearLogs() {
    this.latencyLogs = [];
    this.endpointStats.clear();
    await AsyncStorage.removeItem(LATENCY_LOGS_KEY);
    await AsyncStorage.removeItem(ENDPOINT_STATS_KEY);
  }

  dispose() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

export default new LatencyOptimizer();
