import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/AppActions.js
// Generated: 2026-06-24

import { NativeModules, AppState } from 'react-native';

const { ManuUsageStats, ManuNotificationManager } = NativeModules;

const APP_ACTIONS_KEY = '@manu_ai_app_actions';
const APP_LOG_KEY = '@manu_ai_app_log';

class AppActions {
  constructor() {
    this.rules = [
      {
        id: 'youtube_timer',
        name: 'YouTube → Timer Suggest',
        packageName: 'com.google.android.youtube',
        trigger: 'open',
        action: 'suggest_timer',
        enabled: true,
      },
      {
        id: 'social_limit',
        name: 'Social Apps → Usage Reminder',
        packageName: 'com.instagram.android',
        trigger: 'time_exceeded',
        action: 'usage_reminder',
        limitMinutes: 30,
        enabled: false,
      },
      {
        id: 'camera_suggest',
        name: 'Camera → Suggest Modes',
        packageName: 'com.android.camera',
        trigger: 'open',
        action: 'suggest_modes',
        enabled: false,
      },
      {
        id: 'maps_navigate',
        name: 'Maps → Quick Navigate',
        packageName: 'com.google.android.apps.maps',
        trigger: 'open',
        action: 'quick_navigate',
        enabled: false,
      },
    ];
    this.log = [];
    this.maxLog = 100;
    this.currentApp = null;
    this.appStartTime = null;
    this.loadData();
    this.setupAppStateListener();
  }

  async loadData() {
    try {
      const r = await AsyncStorage.getItem(APP_ACTIONS_KEY);
      if (r) this.rules = JSON.parse(r);
      const l = await AsyncStorage.getItem(APP_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('AppActions load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(APP_ACTIONS_KEY, JSON.stringify(this.rules));
      await AsyncStorage.setItem(APP_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('AppActions save error:', e);
    }
  }

  setupAppStateListener() {
    AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        this.detectForegroundApp();
      }
    });
  }

  async detectForegroundApp() {
    try {
      if (ManuUsageStats) {
        const app = await ManuUsageStats.getForegroundApp();
        if (app && app.packageName !== this.currentApp) {
          this.currentApp = app.packageName;
          this.appStartTime = Date.now();
          await this.handleAppOpen(app.packageName);
        }
      }
    } catch (e) {
      console.warn('App detection failed:', e);
    }
  }

  async handleAppOpen(packageName) {
    const rules = this.rules.filter(r =>
      r.enabled && r.packageName === packageName && r.trigger === 'open'
    );
    for (const rule of rules) {
      await this.executeAction(rule, packageName);
    }
  }

  async checkUsageLimits() {
    if (!this.currentApp || !this.appStartTime) return;
    const elapsedMinutes = (Date.now() - this.appStartTime) / 60000;

    const rules = this.rules.filter(r =>
      r.enabled &&
      r.packageName === this.currentApp &&
      r.trigger === 'time_exceeded' &&
      r.limitMinutes &&
      elapsedMinutes >= r.limitMinutes
    );

    for (const rule of rules) {
      await this.executeAction(rule, this.currentApp);
    }
  }

  async executeAction(rule, packageName) {
    try {
      switch (rule.action) {
        case 'suggest_timer':
          await this.showNotification(
            '⏱️ Timer Suggestion',
            'Would you like to set a timer for this session?',
            { action: 'set_timer', packageName }
          );
          break;
        case 'usage_reminder':
          await this.showNotification(
            '⏰ Usage Limit',
            `You've been using this app for ${rule.limitMinutes}+ minutes. Consider a break.`,
            { action: 'usage_alert', packageName }
          );
          break;
        case 'suggest_modes':
          await this.showNotification(
            '📷 Camera Tips',
            'Try Night mode or Portrait mode for better shots.',
            { action: 'camera_tips', packageName }
          );
          break;
        case 'quick_navigate':
          await this.showNotification(
            '🗺️ Quick Navigate',
            'Tap to navigate to your next calendar event location.',
            { action: 'quick_nav', packageName }
          );
          break;
        case 'brightness_adjust':
          // Adjust brightness for specific apps
          break;
        default:
          break;
      }
      this.log.push({
        ruleId: rule.id,
        action: rule.action,
        packageName,
        timestamp: Date.now(),
      });
      this.saveData();
    } catch (e) {
      console.warn('App action execution failed:', e);
    }
  }

  async showNotification(title, body, data) {
    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title,
          body,
          channelId: 'app_actions',
          priority: 'low',
          data,
        });
      }
    } catch (e) {}
  }

  addRule(rule) {
    const newRule = {
      id: rule.id || `app_${Date.now()}`,
      name: rule.name,
      packageName: rule.packageName,
      trigger: rule.trigger || 'open',
      action: rule.action,
      limitMinutes: rule.limitMinutes,
      enabled: rule.enabled !== false,
    };
    this.rules.push(newRule);
    this.saveData();
    return newRule;
  }

  removeRule(id) {
    this.rules = this.rules.filter(r => r.id !== id);
    this.saveData();
  }

  toggleRule(id) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.saveData();
    }
  }

  getRules() {
    return this.rules;
  }

  getLog() {
    return this.log;
  }

  getCurrentApp() {
    return this.currentApp;
  }
}

export default new AppActions();
