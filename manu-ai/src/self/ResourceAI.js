import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/ResourceAI.js
// Generated: 2026-06-24
// Feature 124: Resource Allocation AI — CPU/RAM/Disk smart allocate

import { NativeModules, AppState } from 'react-native';

const RESOURCE_STATE_KEY = '@manu_ai/resource_state';
const ALLOCATION_LOG_KEY = '@manu_ai/allocation_log';

class ResourceAI {
  constructor() {
    this.resourceState = {
      cpuUsage: 0,
      ramUsage: 0,
      diskUsage: 0,
      batteryLevel: 100,
      networkType: 'unknown',
    };
    this.allocations = new Map();
    this.allocationLog = [];
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.init();
  }

  async init() {
    await this.loadState();
    await this.loadLog();
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem(RESOURCE_STATE_KEY);
      if (stored) {
        this.resourceState = { ...this.resourceState, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem(RESOURCE_STATE_KEY, JSON.stringify(this.resourceState));
    } catch (e) {}
  }

  async loadLog() {
    try {
      const stored = await AsyncStorage.getItem(ALLOCATION_LOG_KEY);
      this.allocationLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.allocationLog = [];
    }
  }

  async saveLog() {
    try {
      await AsyncStorage.setItem(ALLOCATION_LOG_KEY, JSON.stringify(this.allocationLog.slice(-100)));
    } catch (e) {}
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.monitorInterval = setInterval(() => {
      this.updateResourceState();
      this.optimizeAllocations();
    }, 10000); // Every 10 seconds
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async updateResourceState() {
    try {
      if (NativeModules.ManuNativeBridge && NativeModules.ManuNativeBridge.getResourceInfo) {
        const info = await NativeModules.ManuNativeBridge.getResourceInfo();
        this.resourceState = { ...this.resourceState, ...info };
      }
    } catch (e) {}

    this.resourceState.appState = AppState.currentState;
    await this.saveState();
  }

  registerResourceConsumer(consumerId, config) {
    this.allocations.set(consumerId, {
      id: consumerId,
      name: config.name || consumerId,
      priority: config.priority || 'normal', // critical, high, normal, low
      minCpu: config.minCpu || 0,
      maxCpu: config.maxCpu || 100,
      minRam: config.minRam || 0,
      maxRam: config.maxRam || 100,
      currentCpu: 0,
      currentRam: 0,
      isThrottled: false,
      enabled: true,
    });
  }

  async optimizeAllocations() {
    const consumers = Array.from(this.allocations.values());
    if (consumers.length === 0) return;

    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    consumers.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    let availableCpu = 100 - this.resourceState.cpuUsage;
    let availableRam = 100 - this.resourceState.ramUsage;

    const decisions = [];

    for (const consumer of consumers) {
      if (!consumer.enabled) continue;

      let allocatedCpu = consumer.maxCpu;
      let allocatedRam = consumer.maxRam;
      let throttled = false;

      // Throttle based on available resources
      if (availableCpu < consumer.minCpu) {
        allocatedCpu = Math.max(0, availableCpu);
        throttled = true;
      }
      if (availableRam < consumer.minRam) {
        allocatedRam = Math.max(0, availableRam);
        throttled = true;
      }

      // Reserve resources for critical consumers
      if (consumer.priority === 'critical') {
        allocatedCpu = consumer.maxCpu;
        allocatedRam = consumer.maxRam;
        throttled = false;
      }

      // Battery-based throttling
      if (this.resourceState.batteryLevel < 20 && consumer.priority !== 'critical') {
        allocatedCpu *= 0.5;
        allocatedRam *= 0.7;
        throttled = true;
      }

      // Background state throttling
      if (AppState.currentState === 'background' && consumer.priority !== 'critical') {
        allocatedCpu *= 0.3;
        allocatedRam *= 0.5;
        throttled = true;
      }

      consumer.currentCpu = allocatedCpu;
      consumer.currentRam = allocatedRam;
      consumer.isThrottled = throttled;

      availableCpu -= allocatedCpu;
      availableRam -= allocatedRam;

      decisions.push({
        consumerId: consumer.id,
        allocatedCpu,
        allocatedRam,
        throttled,
        reason: throttled ? this.getThrottleReason(consumer) : 'NONE',
      });
    }

    this.allocations = new Map(consumers.map(c => [c.id, c]));

    this.allocationLog.push({
      timestamp: Date.now(),
      resourceState: { ...this.resourceState },
      decisions,
    });
    await this.saveLog();

    return decisions;
  }

  getThrottleReason(consumer) {
    if (this.resourceState.batteryLevel < 20) return 'LOW_BATTERY';
    if (AppState.currentState === 'background') return 'BACKGROUND';
    if (this.resourceState.cpuUsage > 80) return 'HIGH_CPU';
    if (this.resourceState.ramUsage > 85) return 'HIGH_RAM';
    return 'RESOURCE_CONSTRAINT';
  }

  getAllocation(consumerId) {
    return this.allocations.get(consumerId) || null;
  }

  setConsumerEnabled(consumerId, enabled) {
    const consumer = this.allocations.get(consumerId);
    if (consumer) {
      consumer.enabled = enabled;
      this.allocations.set(consumerId, consumer);
    }
  }

  async getResourceReport() {
    const consumers = Array.from(this.allocations.values());
    const throttledCount = consumers.filter(c => c.isThrottled).length;

    return {
      currentResources: { ...this.resourceState },
      consumerCount: consumers.length,
      throttledCount,
      consumers: consumers.map(c => ({
        id: c.id,
        name: c.name,
        priority: c.priority,
        currentCpu: c.currentCpu,
        currentRam: c.currentRam,
        isThrottled: c.isThrottled,
        enabled: c.enabled,
      })),
    };
  }

  async getAllocationLog(limit = 50) {
    return this.allocationLog.slice(-limit);
  }

  async clearLog() {
    this.allocationLog = [];
    await AsyncStorage.removeItem(ALLOCATION_LOG_KEY);
  }

  dispose() {
    this.stopMonitoring();
  }
}

export default new ResourceAI();
