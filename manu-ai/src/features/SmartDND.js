import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/SmartDND.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuNotificationManager, ManuAudioManager } = NativeModules;

const DND_SETTINGS_KEY = '@manu_ai_dnd_settings';
const DND_STATE_KEY = '@manu_ai_dnd_state';
const DND_LOG_KEY = '@manu_ai_dnd_log';

class SmartDND {
  constructor() {
    this.settings = {
      enabled: false,
      autoEnable: true,
      calendarSync: true,
      sleepHours: { start: 22, end: 7 },
      workHours: { start: 9, end: 18 },
      allowCallsFrom: 'contacts', // 'all', 'contacts', 'favorites', 'none'
      allowRepeatCallers: true,
      allowAlarm: true,
      priorityApps: [],
      locationBased: true,
    };
    this.state = {
      isActive: false,
      reason: null,
      since: null,
    };
    this.log = [];
    this.maxLog = 100;
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(DND_SETTINGS_KEY);
      if (s) this.settings = { ...this.settings, ...JSON.parse(s) };
      const st = await AsyncStorage.getItem(DND_STATE_KEY);
      if (st) this.state = JSON.parse(st);
      const l = await AsyncStorage.getItem(DND_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('SmartDND load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(DND_SETTINGS_KEY, JSON.stringify(this.settings));
      await AsyncStorage.setItem(DND_STATE_KEY, JSON.stringify(this.state));
      await AsyncStorage.setItem(DND_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('SmartDND save error:', e);
    }
  }

  async enableDND(reason = 'manual') {
    if (this.state.isActive) return false;
    this.state = { isActive: true, reason, since: Date.now() };
    this.logAction('enabled', reason);
    await this.saveData();
    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.setInterruptionFilter('PRIORITY');
      }
      if (ManuAudioManager) {
        await ManuAudioManager.setRingerMode('SILENT');
      }
    } catch (e) {
      console.warn('SmartDND enable error:', e);
    }
    return true;
  }

  async disableDND(reason = 'manual') {
    if (!this.state.isActive) return false;
    this.state = { isActive: false, reason: null, since: null };
    this.logAction('disabled', reason);
    await this.saveData();
    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.setInterruptionFilter('ALL');
      }
      if (ManuAudioManager) {
        await ManuAudioManager.setRingerMode('NORMAL');
      }
    } catch (e) {
      console.warn('SmartDND disable error:', e);
    }
    return true;
  }

  async evaluateAndToggle(context) {
    if (!this.settings.enabled || !this.settings.autoEnable) return;

    const shouldBeOn = this.shouldActivateDND(context);
    if (shouldBeOn && !this.state.isActive) {
      await this.enableDND(this.inferReason(context));
    } else if (!shouldBeOn && this.state.isActive) {
      await this.disableDND('auto_context_change');
    }
  }

  shouldActivateDND(context) {
    const hour = new Date().getHours();

    // Sleep hours
    if (this.isInSleepHours(hour)) {
      return true;
    }

    // Work hours + at work location
    if (this.isInWorkHours(hour) && context?.location?.isWork && this.settings.locationBased) {
      return true;
    }

    // Calendar event active (if calendar sync enabled)
    if (this.settings.calendarSync && context?.calendarEventActive) {
      return true;
    }

    // Driving
    if (context?.activity?.type === 'IN_VEHICLE') {
      return true;
    }

    // Manual override in state
    return false;
  }

  isInSleepHours(hour) {
    const { start, end } = this.settings.sleepHours;
    if (start < end) {
      return hour >= start && hour < end;
    }
    return hour >= start || hour < end;
  }

  isInWorkHours(hour) {
    const { start, end } = this.settings.workHours;
    return hour >= start && hour < end;
  }

  inferReason(context) {
    const hour = new Date().getHours();
    if (this.isInSleepHours(hour)) return 'sleep_time';
    if (context?.location?.isWork) return 'at_work';
    if (context?.calendarEventActive) return 'calendar_event';
    if (context?.activity?.type === 'IN_VEHICLE') return 'driving';
    return 'auto';
  }

  async allowCall(number) {
    // Check if call should be allowed through DND
    if (!this.state.isActive) return true;
    if (this.settings.allowCallsFrom === 'all') return true;
    if (this.settings.allowCallsFrom === 'none') return false;

    // In production, check contacts/favorites via ContactsModule
    // For now, allow if repeat caller
    if (this.settings.allowRepeatCallers) {
      const recentCalls = await this.getRecentCalls();
      const isRepeat = recentCalls.some(c => c.number === number && Date.now() - c.time < 120000);
      if (isRepeat) return true;
    }

    return this.settings.allowCallsFrom === 'contacts'; // Simplified
  }

  async getRecentCalls() {
    try {
      const data = await AsyncStorage.getItem('@manu_ai_call_log');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveData();
  }

  getSettings() {
    return this.settings;
  }

  getState() {
    return this.state;
  }

  logAction(action, reason) {
    this.log.push({ action, reason, timestamp: Date.now() });
    if (this.log.length > this.maxLog) this.log.shift();
  }

  getLog() {
    return this.log;
  }
}

export default new SmartDND();
