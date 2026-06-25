import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/TaskScheduler.js
// Generated: 2026-06-24
// Feature 115: Background Task Scheduler — Smart background task manage

import { AppState, NativeModules } from 'react-native';

const TASK_REGISTRY_KEY = '@manu_ai/task_registry';
const TASK_LOG_KEY = '@manu_ai/task_log';
const MAX_CONCURRENT_TASKS = 3;

class TaskScheduler {
  constructor() {
    this.taskRegistry = {};
    this.taskQueue = [];
    this.runningTasks = new Map();
    this.taskLog = [];
    this.isProcessing = false;
    this.init();
  }

  async init() {
    await this.loadRegistry();
    await this.loadTaskLog();
    this.startQueueProcessor();
  }

  async loadRegistry() {
    try {
      const stored = await AsyncStorage.getItem(TASK_REGISTRY_KEY);
      this.taskRegistry = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this.taskRegistry = {};
    }
  }

  async saveRegistry() {
    try {
      await AsyncStorage.setItem(TASK_REGISTRY_KEY, JSON.stringify(this.taskRegistry));
    } catch (e) {}
  }

  async loadTaskLog() {
    try {
      const stored = await AsyncStorage.getItem(TASK_LOG_KEY);
      this.taskLog = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.taskLog = [];
    }
  }

  async saveTaskLog() {
    try {
      await AsyncStorage.setItem(TASK_LOG_KEY, JSON.stringify(this.taskLog.slice(-200)));
    } catch (e) {}
  }

  registerTask(taskId, config) {
    this.taskRegistry[taskId] = {
      id: taskId,
      name: config.name || taskId,
      intervalMs: config.intervalMs || 60000,
      priority: config.priority || 'normal', // critical, high, normal, low
      runInBackground: config.runInBackground !== false,
      runInForeground: config.runInForeground !== false,
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 5000,
      timeoutMs: config.timeoutMs || 30000,
      requiresNetwork: config.requiresNetwork || false,
      requiresBattery: config.requiresBattery !== false, // false means can run while charging only
      lastRun: 0,
      nextRun: 0,
      runCount: 0,
      failureCount: 0,
      enabled: true,
      handler: null, // Will be set by the module
    };

    this.saveRegistry();
  }

  setTaskHandler(taskId, handlerFn) {
    if (this.taskRegistry[taskId]) {
      this.taskRegistry[taskId].handler = handlerFn;
    }
  }

  async scheduleTask(taskId, delayMs = 0) {
    const task = this.taskRegistry[taskId];
    if (!task || !task.enabled) return false;

    const scheduledTime = Date.now() + delayMs;
    task.nextRun = scheduledTime;
    await this.saveRegistry();

    this.taskQueue.push({
      taskId,
      scheduledTime,
      priority: task.priority,
      attempts: 0,
    });

    this.sortQueue();
    return true;
  }

  sortQueue() {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    this.taskQueue.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.scheduledTime - b.scheduledTime;
    });
  }

  startQueueProcessor() {
    this.queueInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Check every 5 seconds
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = Date.now();
    const appState = AppState.currentState;

    // Filter eligible tasks
    const eligible = this.taskQueue.filter(item => {
      if (item.scheduledTime > now) return false;
      const task = this.taskRegistry[item.taskId];
      if (!task || !task.enabled) return false;
      if (appState === 'background' && !task.runInBackground) return false;
      if (appState === 'active' && !task.runInForeground) return false;
      if (this.runningTasks.size >= MAX_CONCURRENT_TASKS) return false;
      return true;
    });

    for (const item of eligible) {
      if (this.runningTasks.size >= MAX_CONCURRENT_TASKS) break;
      await this.executeTask(item);
    }

    this.isProcessing = false;
  }

  async executeTask(queueItem) {
    const task = this.taskRegistry[queueItem.taskId];
    if (!task || !task.handler) return;

    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const startTime = Date.now();

    this.runningTasks.set(runId, {
      taskId: queueItem.taskId,
      startTime,
      timeout: setTimeout(() => {
        this.handleTaskTimeout(runId, queueItem);
      }, task.timeoutMs),
    });

    try {
      await task.handler();
      this.handleTaskSuccess(runId, queueItem, startTime);
    } catch (error) {
      this.handleTaskFailure(runId, queueItem, error, startTime);
    }
  }

  handleTaskSuccess(runId, queueItem, startTime) {
    const task = this.taskRegistry[queueItem.taskId];
    const runInfo = this.runningTasks.get(runId);
    if (runInfo && runInfo.timeout) clearTimeout(runInfo.timeout);
    this.runningTasks.delete(runId);

    task.runCount += 1;
    task.lastRun = Date.now();
    task.nextRun = Date.now() + task.intervalMs;
    task.failureCount = 0;

    // Remove from queue
    const idx = this.taskQueue.findIndex(q => q.taskId === queueItem.taskId && q.scheduledTime === queueItem.scheduledTime);
    if (idx !== -1) this.taskQueue.splice(idx, 1);

    this.logTaskEvent(queueItem.taskId, 'SUCCESS', { duration: Date.now() - startTime });
    this.scheduleTask(queueItem.taskId, task.intervalMs);
    this.saveRegistry();
  }

  handleTaskFailure(runId, queueItem, error, startTime) {
    const task = this.taskRegistry[queueItem.taskId];
    const runInfo = this.runningTasks.get(runId);
    if (runInfo && runInfo.timeout) clearTimeout(runInfo.timeout);
    this.runningTasks.delete(runId);

    task.failureCount += 1;
    queueItem.attempts += 1;

    this.logTaskEvent(queueItem.taskId, 'FAILURE', {
      error: error.message,
      duration: Date.now() - startTime,
      attempt: queueItem.attempts,
    });

    if (queueItem.attempts < task.maxRetries) {
      queueItem.scheduledTime = Date.now() + task.retryDelayMs * queueItem.attempts;
      this.sortQueue();
    } else {
      // Max retries exceeded, remove from queue
      const idx = this.taskQueue.findIndex(q => q.taskId === queueItem.taskId && q.attempts === queueItem.attempts);
      if (idx !== -1) this.taskQueue.splice(idx, 1);
      this.logTaskEvent(queueItem.taskId, 'MAX_RETRIES_EXCEEDED', {});
    }

    this.saveRegistry();
  }

  handleTaskTimeout(runId, queueItem) {
    const task = this.taskRegistry[queueItem.taskId];
    if (!task) return;

    this.runningTasks.delete(runId);
    this.logTaskEvent(queueItem.taskId, 'TIMEOUT', { timeout: task.timeoutMs });

    // Requeue with delay
    queueItem.attempts += 1;
    if (queueItem.attempts < task.maxRetries) {
      queueItem.scheduledTime = Date.now() + task.retryDelayMs;
      this.sortQueue();
    }
  }

  logTaskEvent(taskId, eventType, data) {
    const entry = {
      taskId,
      eventType,
      timestamp: Date.now(),
      data,
    };
    this.taskLog.push(entry);
    this.saveTaskLog();
  }

  enableTask(taskId) {
    if (this.taskRegistry[taskId]) {
      this.taskRegistry[taskId].enabled = true;
      this.saveRegistry();
    }
  }

  disableTask(taskId) {
    if (this.taskRegistry[taskId]) {
      this.taskRegistry[taskId].enabled = false;
      // Remove from queue
      this.taskQueue = this.taskQueue.filter(q => q.taskId !== taskId);
      this.saveRegistry();
    }
  }

  getTaskStatus(taskId) {
    const task = this.taskRegistry[taskId];
    if (!task) return null;

    const isRunning = Array.from(this.runningTasks.values()).some(r => r.taskId === taskId);
    const isQueued = this.taskQueue.some(q => q.taskId === taskId);

    return {
      ...task,
      isRunning,
      isQueued,
      queuePosition: isQueued ? this.taskQueue.findIndex(q => q.taskId === taskId) + 1 : 0,
    };
  }

  getAllTaskStatuses() {
    return Object.keys(this.taskRegistry).map(id => this.getTaskStatus(id));
  }

  async getTaskLog(filter = {}) {
    let logs = [...this.taskLog];
    if (filter.taskId) logs = logs.filter(l => l.taskId === filter.taskId);
    if (filter.eventType) logs = logs.filter(l => l.eventType === filter.eventType);
    return logs.slice(-(filter.limit || 100));
  }

  async clearTaskLog() {
    this.taskLog = [];
    await AsyncStorage.removeItem(TASK_LOG_KEY);
  }

  dispose() {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
    }
    // Cancel all running timeouts
    for (const [, runInfo] of this.runningTasks.entries()) {
      if (runInfo.timeout) clearTimeout(runInfo.timeout);
    }
    this.runningTasks.clear();
  }
}

export default new TaskScheduler();
