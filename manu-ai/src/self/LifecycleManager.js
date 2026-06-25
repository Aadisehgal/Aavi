import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/LifecycleManager.js
// Generated: 2026-06-24
// Feature 125: App Lifecycle Manager — Central lifecycle coordination

import { AppState} from 'react-native';

const LIFECYCLE_STATE_KEY = '@manu_ai/lifecycle_state';

class LifecycleManager {
  constructor() {
    this.currentState = AppState.currentState;
    this.previousState = null;
    this.stateHistory = [];
    this.listeners = new Map();
    this.modules = new Map();
    this.init();
  }

  async init() {
    await this.loadState();
    this.setupAppStateListener();
    this.startHeartbeat();
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem(LIFECYCLE_STATE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.stateHistory = data.stateHistory || [];
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem(LIFECYCLE_STATE_KEY, JSON.stringify({
        stateHistory: this.stateHistory.slice(-100),
        lastSaved: Date.now(),
      }));
    } catch (e) {}
  }

  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      this.handleStateChange(nextAppState);
    });
  }

  async handleStateChange(nextAppState) {
    this.previousState = this.currentState;
    this.currentState = nextAppState;

    const transition = {
      from: this.previousState,
      to: nextAppState,
      timestamp: Date.now(),
    };

    this.stateHistory.push(transition);
    await this.saveState();

    // Notify all listeners
    this.listeners.forEach((callback, id) => {
      try {
        callback(transition);
      } catch (e) {
        console.warn(`Lifecycle listener ${id} error:`, e);
      }
    });

    // Notify registered modules
    for (const [moduleName, module] of this.modules.entries()) {
      if (module.onAppStateChange) {
        try {
          await module.onAppStateChange(transition);
        } catch (e) {}
      }
    }

    // Handle specific state transitions
    if (nextAppState === 'background') {
      await this.handleBackgroundTransition();
    } else if (nextAppState === 'active' && this.previousState === 'background') {
      await this.handleForegroundTransition();
    } else if (nextAppState === 'inactive') {
      await this.handleInactiveTransition();
    }
  }

  async handleBackgroundTransition() {
    for (const [moduleName, module] of this.modules.entries()) {
      if (module.onBackground) {
        try {
          await module.onBackground();
        } catch (e) {}
      }
    }
  }

  async handleForegroundTransition() {
    for (const [moduleName, module] of this.modules.entries()) {
      if (module.onForeground) {
        try {
          await module.onForeground();
        } catch (e) {}
      }
    }
  }

  async handleInactiveTransition() {
    for (const [moduleName, module] of this.modules.entries()) {
      if (module.onInactive) {
        try {
          await module.onInactive();
        } catch (e) {}
      }
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.modules.forEach((module, name) => {
        if (module.onHeartbeat) {
          try {
            module.onHeartbeat({
              appState: this.currentState,
              timestamp: Date.now(),
            });
          } catch (e) {}
        }
      });
    }, 30000); // Every 30 seconds
  }

  registerModule(moduleName, moduleInstance) {
    this.modules.set(moduleName, moduleInstance);
  }

  unregisterModule(moduleName) {
    this.modules.delete(moduleName);
  }

  addListener(listenerId, callback) {
    this.listeners.set(listenerId, callback);
    return () => this.listeners.delete(listenerId);
  }

  removeListener(listenerId) {
    this.listeners.delete(listenerId);
  }

  getCurrentState() {
    return this.currentState;
  }

  getPreviousState() {
    return this.previousState;
  }

  getStateHistory(limit = 50) {
    return this.stateHistory.slice(-limit);
  }

  getTimeInCurrentState() {
    const lastTransition = this.stateHistory[this.stateHistory.length - 1];
    if (!lastTransition) return 0;
    return Date.now() - lastTransition.timestamp;
  }

  getModuleStatus() {
    const status = {};
    for (const [name, module] of this.modules.entries()) {
      status[name] = {
        hasBackgroundHandler: !!module.onBackground,
        hasForegroundHandler: !!module.onForeground,
        hasHeartbeat: !!module.onHeartbeat,
      };
    }
    return status;
  }

  async clearHistory() {
    this.stateHistory = [];
    await AsyncStorage.removeItem(LIFECYCLE_STATE_KEY);
  }

  dispose() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.listeners.clear();
    this.modules.clear();
  }
}

export default new LifecycleManager();
