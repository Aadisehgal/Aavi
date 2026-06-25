import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/AutoUpdate.js
// Generated: 2026-06-24
// Feature 105: Auto-Update Intelligence — Critical update auto, optional notify

import { NativeModules, Platform, AppState } from 'react-native';

const UPDATE_CONFIG_KEY = '@manu_ai/update_config';
const UPDATE_HISTORY_KEY = '@manu_ai/update_history';
const LAST_CHECK_KEY = '@manu_ai/last_update_check';
const UPDATE_ENDPOINT_KEY = '@manu_ai/update_endpoint';

const DEFAULT_CONFIG = {
  autoUpdateCritical: true,
  notifyOptional: true,
  checkIntervalHours: 24,
  downloadOnWifiOnly: true,
  installOnIdle: true,
  currentVersion: '2.0.0',
  buildNumber: 200,
};

class AutoUpdate {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.updateHistory = [];
    this.pendingUpdate = null;
    this.isChecking = false;
    this.init();
  }

  async init() {
    await this.loadConfig();
    await this.loadHistory();
    this.startPeriodicCheck();
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem(UPDATE_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem(UPDATE_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {}
  }

  async loadHistory() {
    try {
      const stored = await AsyncStorage.getItem(UPDATE_HISTORY_KEY);
      this.updateHistory = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.updateHistory = [];
    }
  }

  async saveHistory() {
    try {
      await AsyncStorage.setItem(UPDATE_HISTORY_KEY, JSON.stringify(this.updateHistory.slice(-50)));
    } catch (e) {}
  }

  async setUpdateEndpoint(endpointUrl) {
    await AsyncStorage.setItem(UPDATE_ENDPOINT_KEY, endpointUrl);
  }

  async getUpdateEndpoint() {
    try {
      return await AsyncStorage.getItem(UPDATE_ENDPOINT_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  startPeriodicCheck() {
    // Check on app state changes
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.checkIfUpdateNeeded();
      }
    });

    // Initial check
    this.checkIfUpdateNeeded();
  }

  async checkIfUpdateNeeded() {
    const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    const intervalMs = this.config.checkIntervalHours * 3600 * 1000;

    if (lastCheck && now - parseInt(lastCheck, 10) < intervalMs) {
      return;
    }

    await this.checkForUpdates();
  }

  async checkForUpdates() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const endpoint = await this.getUpdateEndpoint();
      if (!endpoint) {
        this.isChecking = false;
        return;
      }

      const response = await fetch(`${endpoint}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: this.config.currentVersion,
          buildNumber: this.config.buildNumber,
          platform: Platform.OS,
          osVersion: Platform.Version,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const updateInfo = await response.json();
      await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

      if (updateInfo.available) {
        await this.processUpdate(updateInfo);
      }
    } catch (error) {
      await this.logUpdateEvent('CHECK_FAILED', { error: error.message });
    } finally {
      this.isChecking = false;
    }
  }

  async processUpdate(updateInfo) {
    this.pendingUpdate = updateInfo;

    const entry = {
      timestamp: Date.now(),
      version: updateInfo.version,
      buildNumber: updateInfo.buildNumber,
      severity: updateInfo.severity || 'optional',
      changelog: updateInfo.changelog || '',
      sizeMb: updateInfo.sizeMb || 0,
    };

    this.updateHistory.push(entry);
    await this.saveHistory();

    if (updateInfo.severity === 'critical' && this.config.autoUpdateCritical) {
      await this.downloadAndInstallUpdate(updateInfo);
    } else if (this.config.notifyOptional) {
      await this.logUpdateEvent('UPDATE_AVAILABLE', entry);
      // Notify UI layer
      this.notifyUpdateAvailable(entry);
    }
  }

  async downloadAndInstallUpdate(updateInfo) {
    await this.logUpdateEvent('DOWNLOAD_STARTED', { version: updateInfo.version });

    try {
      // Simulate download process
      const downloadSuccess = await this.simulateDownload(updateInfo);

      if (downloadSuccess) {
        await this.logUpdateEvent('DOWNLOAD_COMPLETED', { version: updateInfo.version });

        if (this.config.installOnIdle && AppState.currentState !== 'active') {
          await this.installUpdate(updateInfo);
        } else {
          await this.logUpdateEvent('INSTALL_QUEUED', { version: updateInfo.version });
        }
      }
    } catch (error) {
      await this.logUpdateEvent('DOWNLOAD_FAILED', { error: error.message });
    }
  }

  async simulateDownload(updateInfo) {
    // In production, this would download the actual update package
    // For now, simulate with a delay
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 2000);
    });
  }

  async installUpdate(updateInfo) {
    await this.logUpdateEvent('INSTALL_STARTED', { version: updateInfo.version });

    try {
      if (Platform.OS === 'android' && NativeModules.ManuNativeBridge) {
        NativeModules.ManuNativeBridge.installUpdate(updateInfo.downloadUrl);
      }

      // Update local version
      this.config.currentVersion = updateInfo.version;
      this.config.buildNumber = updateInfo.buildNumber;
      await this.saveConfig();

      await this.logUpdateEvent('INSTALL_COMPLETED', { version: updateInfo.version });
    } catch (error) {
      await this.logUpdateEvent('INSTALL_FAILED', { error: error.message });
    }
  }

  notifyUpdateAvailable(updateEntry) {
    // This would trigger a notification or UI update
    // Stored for UI layer to pick up
    this.pendingUpdateNotification = updateEntry;
  }

  getPendingUpdate() {
    return this.pendingUpdate;
  }

  clearPendingUpdate() {
    this.pendingUpdate = null;
    this.pendingUpdateNotification = null;
  }

  async logUpdateEvent(eventType, data) {
    const logEntry = {
      eventType,
      timestamp: Date.now(),
      data,
    };
    // Store in general logs or update-specific logs
    try {
      const logs = await AsyncStorage.getItem('@manu_ai/update_logs') || '[]';
      const parsed = JSON.parse(logs);
      parsed.push(logEntry);
      await AsyncStorage.setItem('@manu_ai/update_logs', JSON.stringify(parsed.slice(-100)));
    } catch (e) {}
  }

  async getUpdateHistory() {
    return this.updateHistory;
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  getConfig() {
    return { ...this.config };
  }

  dispose() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export default new AutoUpdate();
