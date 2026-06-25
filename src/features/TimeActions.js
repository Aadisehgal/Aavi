import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/TimeActions.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuSettingsModule, ManuAudioManager } = NativeModules;

const TIME_ACTIONS_KEY = '@manu_ai_time_actions';
const TIME_LOG_KEY = '@manu_ai_time_log';

class TimeActions {
  constructor() {
    this.rules = [
      {
        id: 'night_dim',
        name: '10 PM → Dim Screen',
        time: { hour: 22, minute: 0 },
        days: [0, 1, 2, 3, 4, 5, 6],
        action: 'dim_screen',
        enabled: true,
      },
      {
        id: 'night_mute',
        name: '11 PM → Mute',
        time: { hour: 23, minute: 0 },
        days: [0, 1, 2, 3, 4, 5, 6],
        action: 'mute',
        enabled: true,
      },
      {
        id: 'morning_unmute',
        name: '7 AM → Unmute',
        time: { hour: 7, minute: 0 },
        days: [0, 1, 2, 3, 4, 5, 6],
        action: 'unmute',
        enabled: true,
      },
      {
        id: 'work_focus',
        name: '9 AM → Focus Mode',
        time: { hour: 9, minute: 0 },
        days: [1, 2, 3, 4, 5], // Mon-Fri
        action: 'focus_mode',
        enabled: false,
      },
      {
        id: 'lunch_break',
        name: '1 PM → Lunch Mode',
        time: { hour: 13, minute: 0 },
        days: [1, 2, 3, 4, 5],
        action: 'lunch_mode',
        enabled: false,
      },
    ];
    this.log = [];
    this.maxLog = 100;
    this.checkInterval = null;
    this.lastCheckedMinute = null;
    this.loadData();
  }

  async loadData() {
    try {
      const r = await AsyncStorage.getItem(TIME_ACTIONS_KEY);
      if (r) this.rules = JSON.parse(r);
      const l = await AsyncStorage.getItem(TIME_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('TimeActions load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(TIME_ACTIONS_KEY, JSON.stringify(this.rules));
      await AsyncStorage.setItem(TIME_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('TimeActions save error:', e);
    }
  }

  startMonitoring() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.checkRules(), 30000); // Check every 30 seconds
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkRules() {
    const now = new Date();
    const currentMinute = `${now.getHours()}:${now.getMinutes()}`;
    if (currentMinute === this.lastCheckedMinute) return;
    this.lastCheckedMinute = currentMinute;

    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!rule.days.includes(currentDay)) continue;
      if (rule.time.hour === currentHour && rule.time.minute === currentMin) {
        this.executeAction(rule);
      }
    }
  }

  async executeAction(rule) {
    try {
      switch (rule.action) {
        case 'dim_screen':
          if (ManuSettingsModule) await ManuSettingsModule.setBrightness(30);
          break;
        case 'bright_screen':
          if (ManuSettingsModule) await ManuSettingsModule.setBrightness(200);
          break;
        case 'mute':
          if (ManuAudioManager) await ManuAudioManager.setRingerMode('SILENT');
          break;
        case 'unmute':
          if (ManuAudioManager) await ManuAudioManager.setRingerMode('NORMAL');
          break;
        case 'vibrate':
          if (ManuAudioManager) await ManuAudioManager.setRingerMode('VIBRATE');
          break;
        case 'focus_mode':
          // Enable DND, block notifications
          if (ManuSettingsModule) await ManuSettingsModule.setInterruptionFilter('PRIORITY');
          break;
        case 'lunch_mode':
          // Relax DND, suggest restaurants
          if (ManuSettingsModule) await ManuSettingsModule.setInterruptionFilter('ALL');
          break;
        case 'night_mode':
          if (ManuSettingsModule) {
            await ManuSettingsModule.setBrightness(20);
            await ManuSettingsModule.setBlueLightFilter(true);
          }
          break;
        case 'morning_mode':
          if (ManuSettingsModule) {
            await ManuSettingsModule.setBrightness(180);
            await ManuSettingsModule.setBlueLightFilter(false);
          }
          break;
        default:
          break;
      }
      this.log.push({
        ruleId: rule.id,
        action: rule.action,
        timestamp: Date.now(),
        success: true,
      });
    } catch (e) {
      this.log.push({
        ruleId: rule.id,
        action: rule.action,
        timestamp: Date.now(),
        success: false,
        error: e.message,
      });
    }
    this.saveData();
  }

  addRule(rule) {
    const newRule = {
      id: rule.id || `time_${Date.now()}`,
      name: rule.name,
      time: rule.time,
      days: rule.days || [0, 1, 2, 3, 4, 5, 6],
      action: rule.action,
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

  getTodayLog() {
    const today = new Date().toISOString().split('T')[0];
    return this.log.filter(l => new Date(l.timestamp).toISOString().split('T')[0] === today);
  }
}

export default new TimeActions();
