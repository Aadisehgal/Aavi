import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/StatePersist.js
// Generated: 2026-06-24
// Feature 114: State Persistence Engine — App kill se bhi state save

import { AppState } from 'react-native';

const STATE_KEY = '@manu_ai/persisted_state';
const STATE_VERSION_KEY = '@manu_ai/state_version';
const CHECKPOINT_KEY = '@manu_ai/state_checkpoints';
const CURRENT_VERSION = '2.0.0';

class StatePersist {
  constructor() {
    this.state = {};
    this.checkpoints = [];
    this.subscribers = new Set();
    this.isRestored = false;
    this.init();
  }

  async init() {
    await this.validateVersion();
    await this.restoreState();
    this.startAutoSave();
  }

  async validateVersion() {
    try {
      const storedVersion = await AsyncStorage.getItem(STATE_VERSION_KEY);
      if (storedVersion && storedVersion !== CURRENT_VERSION) {
        // Version mismatch - clear old state
        await AsyncStorage.removeItem(STATE_KEY);
        await AsyncStorage.removeItem(CHECKPOINT_KEY);
      }
      await AsyncStorage.setItem(STATE_VERSION_KEY, CURRENT_VERSION);
    } catch (e) {}
  }

  async restoreState() {
    try {
      const stored = await AsyncStorage.getItem(STATE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
        this.isRestored = true;
      }
    } catch (e) {
      this.state = {};
      this.isRestored = false;
    }
  }

  async saveState() {
    try {
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify(this.state));
    } catch (e) {}
  }

  startAutoSave() {
    // Save on app state changes
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.saveState();
        this.createCheckpoint();
      }
    });

    // Periodic save every 30 seconds
    this.saveInterval = setInterval(() => {
      this.saveState();
    }, 30000);
  }

  set(key, value, options = {}) {
    const path = key.split('.');
    let current = this.state;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;

    if (options.immediate) {
      this.saveState();
    }

    this.notifySubscribers(key, value);
  }

  get(key, defaultValue = null) {
    const path = key.split('.');
    let current = this.state;

    for (const segment of path) {
      if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, segment)) {
        return defaultValue;
      }
      current = current[segment];
    }

    return current;
  }

  delete(key) {
    const path = key.split('.');
    let current = this.state;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) return;
      current = current[path[i]];
    }

    delete current[path[path.length - 1]];
    this.saveState();
  }

  async createCheckpoint() {
    const checkpoint = {
      id: `checkpoint_${Date.now()}`,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(this.state)),
      appState: AppState.currentState,
    };

    this.checkpoints.push(checkpoint);

    // Keep only last 10 checkpoints
    if (this.checkpoints.length > 10) {
      this.checkpoints = this.checkpoints.slice(-10);
    }

    try {
      await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(this.checkpoints));
    } catch (e) {}
  }

  async restoreCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) return false;

    this.state = JSON.parse(JSON.stringify(checkpoint.state));
    await this.saveState();
    return true;
  }

  async getCheckpoints() {
    try {
      const stored = await AsyncStorage.getItem(CHECKPOINT_KEY);
      this.checkpoints = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.checkpoints = [];
    }
    return this.checkpoints;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(key, value) {
    this.subscribers.forEach(callback => {
      try {
        callback(key, value);
      } catch (e) {}
    });
  }

  getAllState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  async clearState() {
    this.state = {};
    await AsyncStorage.removeItem(STATE_KEY);
    await AsyncStorage.removeItem(CHECKPOINT_KEY);
    this.checkpoints = [];
  }

  async exportState() {
    return {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      state: this.getAllState(),
      checkpoints: this.checkpoints,
    };
  }

  async importState(exportedData) {
    if (!exportedData || !exportedData.state) return false;
    if (exportedData.version !== CURRENT_VERSION) return false;

    this.state = JSON.parse(JSON.stringify(exportedData.state));
    if (exportedData.checkpoints) {
      this.checkpoints = exportedData.checkpoints;
    }
    await this.saveState();
    return true;
  }

  dispose() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.saveState();
  }
}

export default new StatePersist();
