import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/NetworkAdapt.js
// Generated: 2026-06-24

import { NativeModules, NetInfo } from 'react-native';

const { ManuNetworkModule, ManuSettingsModule } = NativeModules;

const NETWORK_KEY = '@manu_ai_network_state';
const NETWORK_LOG_KEY = '@manu_ai_network_log';

class NetworkAdapt {
  constructor() {
    this.state = {
      type: 'unknown',
      isConnected: false,
      isWifi: false,
      isCellular: false,
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      quality: 'unknown', // excellent, good, poor, offline
      lastCheck: null,
    };
    this.log = [];
    this.maxLog = 100;
    this.adaptationRules = {
      reduceImageQuality: true,
      disableAutoPlay: true,
      prefetchOffline: false,
      compressUploads: true,
    };
    this.monitorInterval = null;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(NETWORK_KEY);
      if (s) this.state = JSON.parse(s);
      const l = await AsyncStorage.getItem(NETWORK_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('NetworkAdapt load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(NETWORK_KEY, JSON.stringify(this.state));
      await AsyncStorage.setItem(NETWORK_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('NetworkAdapt save error:', e);
    }
  }

  async startMonitoring(intervalMs = 30000) {
    if (this.monitorInterval) return;
    await this.checkNetworkState();
    this.monitorInterval = setInterval(() => this.checkNetworkState(), intervalMs);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async checkNetworkState() {
    try {
      const netInfo = await NetInfo.fetch();
      let speedTest = { download: 0, upload: 0, latency: 0 };

      if (ManuNetworkModule) {
        speedTest = await ManuNetworkModule.quickSpeedTest();
      }

      const quality = this.assessQuality(netInfo, speedTest);

      this.state = {
        type: netInfo.type,
        isConnected: netInfo.isConnected,
        isWifi: netInfo.type === 'wifi',
        isCellular: netInfo.type === 'cellular',
        downloadSpeed: speedTest.download || 0,
        uploadSpeed: speedTest.upload || 0,
        latency: speedTest.latency || 0,
        quality,
        lastCheck: Date.now(),
      };

      this.log.push({
        ...this.state,
        timestamp: Date.now(),
      });
      if (this.log.length > this.maxLog) this.log.shift();

      await this.applyAdaptations(quality);
      await this.saveData();
    } catch (e) {
      console.warn('Network check failed:', e);
    }
  }

  assessQuality(netInfo, speedTest) {
    if (!netInfo.isConnected) return 'offline';
    if (netInfo.type === 'wifi') {
      if (speedTest.download > 50) return 'excellent';
      if (speedTest.download > 10) return 'good';
      return 'poor';
    }
    if (netInfo.type === 'cellular') {
      if (speedTest.download > 20) return 'good';
      if (speedTest.download > 5) return 'poor';
      return 'poor';
    }
    return 'unknown';
  }

  async applyAdaptations(quality) {
    if (quality === 'offline') {
      await this.enableOfflineMode();
      return;
    }

    if (quality === 'poor') {
      if (this.adaptationRules.reduceImageQuality) {
        await this.setImageQuality('low');
      }
      if (this.adaptationRules.disableAutoPlay) {
        await this.setAutoPlay(false);
      }
      if (this.adaptationRules.compressUploads) {
        await this.setUploadCompression(true);
      }
    } else if (quality === 'good') {
      await this.setImageQuality('medium');
      await this.setAutoPlay(true);
      await this.setUploadCompression(false);
    } else if (quality === 'excellent') {
      await this.setImageQuality('high');
      await this.setAutoPlay(true);
      await this.setUploadCompression(false);
      await this.prefetchContent();
    }
  }

  async enableOfflineMode() {
    try {
      if (ManuSettingsModule) {
        await ManuSettingsModule.setOfflineMode(true);
      }
    } catch (e) {}
  }

  async setImageQuality(quality) {
    try {
      await AsyncStorage.setItem('@manu_ai_image_quality', quality);
    } catch (e) {}
  }

  async setAutoPlay(enabled) {
    try {
      await AsyncStorage.setItem('@manu_ai_auto_play', String(enabled));
    } catch (e) {}
  }

  async setUploadCompression(enabled) {
    try {
      await AsyncStorage.setItem('@manu_ai_compress_uploads', String(enabled));
    } catch (e) {}
  }

  async prefetchContent() {
    if (!this.adaptationRules.prefetchOffline) return;
    // In production, prefetch calendar, messages, maps for offline use
  }

  getState() {
    return this.state;
  }

  getLog() {
    return this.log;
  }

  getAverageSpeed(hours = 1) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recent = this.log.filter(l => l.timestamp > cutoff && l.isConnected);
    if (recent.length === 0) return { download: 0, upload: 0, latency: 0 };
    return {
      download: parseFloat((recent.reduce((s, l) => s + l.downloadSpeed, 0) / recent.length).toFixed(2)),
      upload: parseFloat((recent.reduce((s, l) => s + l.uploadSpeed, 0) / recent.length).toFixed(2)),
      latency: Math.round(recent.reduce((s, l) => s + l.latency, 0) / recent.length),
    };
  }

  isOffline() {
    return this.state.quality === 'offline';
  }

  shouldReduceQuality() {
    return this.state.quality === 'poor' || this.state.isCellular;
  }

  updateRules(newRules) {
    this.adaptationRules = { ...this.adaptationRules, ...newRules };
    this.saveData();
  }

  getRules() {
    return this.adaptationRules;
  }
}

export default new NetworkAdapt();
