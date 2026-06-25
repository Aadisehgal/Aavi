import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/PerfBenchmark.js
// Generated: 2026-06-24
// Feature 123: Performance Benchmark — Device capability score

import { NativeModules, Platform } from 'react-native';

const BENCHMARK_RESULTS_KEY = '@manu_ai/benchmark_results';
const DEVICE_SCORE_KEY = '@manu_ai/device_score';

class PerfBenchmark {
  constructor() {
    this.results = {};
    this.deviceScore = null;
    this.init();
  }

  async init() {
    await this.loadResults();
    await this.loadDeviceScore();
  }

  async loadResults() {
    try {
      const stored = await AsyncStorage.getItem(BENCHMARK_RESULTS_KEY);
      this.results = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.results = {};
    }
  }

  async saveResults() {
    try {
      await AsyncStorage.setItem(BENCHMARK_RESULTS_KEY, JSON.stringify(this.results));
    } catch (e) {}
  }

  async loadDeviceScore() {
    try {
      const stored = await AsyncStorage.getItem(DEVICE_SCORE_KEY);
      this.deviceScore = stored ? JSON.parse(stored) : null;
    } catch (e) {
      this.deviceScore = null;
    }
  }

  async saveDeviceScore() {
    try {
      await AsyncStorage.setItem(DEVICE_SCORE_KEY, JSON.stringify(this.deviceScore));
    } catch (e) {}
  }

  async runFullBenchmark() {
    const startTime = Date.now();
    const results = {
      timestamp: Date.now(),
      tests: {},
      overallScore: 0,
      deviceInfo: await this.getDeviceInfo(),
    };

    // CPU Benchmark
    results.tests.cpu = await this.runCPUBenchmark();

    // Memory Benchmark
    results.tests.memory = await this.runMemoryBenchmark();

    // Storage Benchmark
    results.tests.storage = await this.runStorageBenchmark();

    // Network Benchmark (if available)
    results.tests.network = await this.runNetworkBenchmark();

    // Calculate overall score (0-100)
    const weights = { cpu: 0.35, memory: 0.25, storage: 0.25, network: 0.15 };
    let totalScore = 0;
    let totalWeight = 0;

    for (const [test, weight] of Object.entries(weights)) {
      if (results.tests[test] && results.tests[test].score !== undefined) {
        totalScore += results.tests[test].score * weight;
        totalWeight += weight;
      }
    }

    results.overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    results.duration = Date.now() - startTime;

    this.results = results;
    this.deviceScore = {
      score: results.overallScore,
      classification: this.classifyScore(results.overallScore),
      lastBenchmarked: Date.now(),
    };

    await this.saveResults();
    await this.saveDeviceScore();

    return results;
  }

  async runCPUBenchmark() {
    const start = Date.now();

    // Prime number calculation
    let primes = 0;
    for (let i = 2; i < 50000; i++) {
      let isPrime = true;
      for (let j = 2; j * j <= i; j++) {
        if (i % j === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) primes++;
    }

    const duration = Date.now() - start;
    const score = Math.max(0, Math.min(100, Math.round(10000 / duration)));

    return {
      test: 'CPU_PRIME_CALC',
      duration,
      score,
      details: { primesFound: primes },
    };
  }

  async runMemoryBenchmark() {
    const start = Date.now();

    // Array allocation and manipulation
    const iterations = 100000;
    let arr = [];
    for (let i = 0; i < iterations; i++) {
      arr.push({ index: i, data: `test_data_${i}`, nested: { value: i * 2 } });
    }
    arr.sort((a, b) => b.index - a.index);
    const filtered = arr.filter(item => item.index % 2 === 0);
    arr = null; // Allow GC

    const duration = Date.now() - start;
    const score = Math.max(0, Math.min(100, Math.round(5000 / duration)));

    return {
      test: 'MEMORY_ALLOCATION',
      duration,
      score,
      details: { iterations, filteredCount: filtered.length },
    };
  }

  async runStorageBenchmark() {
    const start = Date.now();
    const testKey = '@manu_ai/benchmark_test';
    const testData = JSON.stringify({ data: 'x'.repeat(10000), timestamp: Date.now() });

    try {
      // Write test
      const writeStart = Date.now();
      for (let i = 0; i < 50; i++) {
        await AsyncStorage.setItem(`${testKey}_${i}`, testData);
      }
      const writeDuration = Date.now() - writeStart;

      // Read test
      const readStart = Date.now();
      for (let i = 0; i < 50; i++) {
        await AsyncStorage.getItem(`${testKey}_${i}`);
      }
      const readDuration = Date.now() - readStart;

      // Cleanup
      for (let i = 0; i < 50; i++) {
        await AsyncStorage.removeItem(`${testKey}_${i}`);
      }

      const totalDuration = Date.now() - start;
      const score = Math.max(0, Math.min(100, Math.round(3000 / totalDuration)));

      return {
        test: 'STORAGE_IO',
        duration: totalDuration,
        score,
        details: { writeDuration, readDuration, operations: 100 },
      };
    } catch (e) {
      return { test: 'STORAGE_IO', duration: Date.now() - start, score: 0, error: e.message };
    }
  }

  async runNetworkBenchmark() {
    const start = Date.now();
    const testUrls = [
      'https://www.google.com/generate_204',
      'https://www.cloudflare.com/cdn-cgi/trace',
    ];

    let totalLatency = 0;
    let successCount = 0;

    for (const url of testUrls) {
      try {
        const reqStart = Date.now();
        await fetch(url, { method: 'HEAD', timeout: 5000 });
        totalLatency += Date.now() - reqStart;
        successCount += 1;
      } catch (e) {}
    }

    const duration = Date.now() - start;
    const avgLatency = successCount > 0 ? totalLatency / successCount : 9999;
    const score = successCount === 0 ? 0 : Math.max(0, Math.min(100, Math.round(1000 / avgLatency)));

    return {
      test: 'NETWORK_LATENCY',
      duration,
      score,
      details: { avgLatency, successCount, totalTests: testUrls.length },
    };
  }

  classifyScore(score) {
    if (score >= 80) return 'HIGH_END';
    if (score >= 60) return 'MID_RANGE';
    if (score >= 40) return 'LOW_MID';
    if (score >= 20) return 'LOW_END';
    return 'VERY_LOW';
  }

  async getDeviceInfo() {
    const info = {
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: '2.0.0',
    };

    try {
      if (NativeModules.ManuNativeBridge && NativeModules.ManuNativeBridge.getDeviceInfo) {
        const nativeInfo = await NativeModules.ManuNativeBridge.getDeviceInfo();
        return { ...info, ...nativeInfo };
      }
    } catch (e) {}

    return info;
  }

  async getDeviceScore() {
    if (!this.deviceScore) {
      return { status: 'NOT_BENCHMARKED', message: 'Run benchmark first' };
    }
    return this.deviceScore;
  }

  async getBenchmarkResults() {
    return this.results;
  }

  async getCapabilityProfile() {
    const score = this.deviceScore?.score || 0;
    return {
      canRunHeavyML: score >= 70,
      canRunAnimations: score >= 50,
      canRunBackgroundSync: score >= 40,
      canCacheLargeData: score >= 60,
      canUseHighResImages: score >= 80,
      recommendedSyncInterval: score >= 60 ? 300000 : 600000, // 5 min vs 10 min
      maxConcurrentTasks: score >= 80 ? 5 : score >= 50 ? 3 : 2,
    };
  }

  async clearBenchmarkData() {
    this.results = {};
    this.deviceScore = null;
    await AsyncStorage.removeItem(BENCHMARK_RESULTS_KEY);
    await AsyncStorage.removeItem(DEVICE_SCORE_KEY);
  }
}

export default new PerfBenchmark();
