import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/HealthReminders.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuNotificationManager } = NativeModules;

const HEALTH_SETTINGS_KEY = '@manu_ai_health_settings';
const HEALTH_LOG_KEY = '@manu_ai_health_log';

class HealthReminders {
  constructor() {
    this.settings = {
      waterBreakEnabled: true,
      waterBreakIntervalMinutes: 60,
      eyeRestEnabled: true,
      eyeRestIntervalMinutes: 120,
      postureCheckEnabled: true,
      postureCheckIntervalMinutes: 90,
      stretchReminderEnabled: true,
      stretchIntervalMinutes: 150,
      sleepReminderEnabled: true,
      sleepTime: { hour: 23, minute: 0 },
      walkReminderEnabled: true,
      walkIntervalMinutes: 180,
    };
    this.log = [];
    this.maxLog = 200;
    this.timers = {};
    this.loadData();
  }

  async loadData() {
    try {
      const s = await AsyncStorage.getItem(HEALTH_SETTINGS_KEY);
      if (s) this.settings = { ...this.settings, ...JSON.parse(s) };
      const l = await AsyncStorage.getItem(HEALTH_LOG_KEY);
      if (l) this.log = JSON.parse(l);
    } catch (e) {
      console.warn('HealthReminders load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(HEALTH_SETTINGS_KEY, JSON.stringify(this.settings));
      await AsyncStorage.setItem(HEALTH_LOG_KEY, JSON.stringify(this.log.slice(-this.maxLog)));
    } catch (e) {
      console.warn('HealthReminders save error:', e);
    }
  }

  startAllReminders() {
    this.stopAllReminders();
    if (this.settings.waterBreakEnabled) this.scheduleReminder('water', this.settings.waterBreakIntervalMinutes);
    if (this.settings.eyeRestEnabled) this.scheduleReminder('eye', this.settings.eyeRestIntervalMinutes);
    if (this.settings.postureCheckEnabled) this.scheduleReminder('posture', this.settings.postureCheckIntervalMinutes);
    if (this.settings.stretchReminderEnabled) this.scheduleReminder('stretch', this.settings.stretchIntervalMinutes);
    if (this.settings.walkReminderEnabled) this.scheduleReminder('walk', this.settings.walkIntervalMinutes);
    if (this.settings.sleepReminderEnabled) this.scheduleSleepReminder();
  }

  stopAllReminders() {
    Object.keys(this.timers).forEach(key => {
      if (this.timers[key]) {
        clearInterval(this.timers[key]);
        this.timers[key] = null;
      }
    });
  }

  scheduleReminder(type, intervalMinutes) {
    const intervalMs = intervalMinutes * 60000;
    this.timers[type] = setInterval(() => {
      this.triggerReminder(type);
    }, intervalMs);
  }

  scheduleSleepReminder() {
    const checkSleep = () => {
      const now = new Date();
      const sleepHour = this.settings.sleepTime.hour;
      const sleepMinute = this.settings.sleepTime.minute;
      if (now.getHours() === sleepHour && now.getMinutes() === sleepMinute) {
        this.triggerReminder('sleep');
      }
    };
    this.timers['sleep'] = setInterval(checkSleep, 60000); // Check every minute
  }

  async triggerReminder(type) {
    const reminders = {
      water: {
        title: '💧 Water Break',
        body: 'Time to drink a glass of water. Stay hydrated!',
        action: 'Drink 250ml water',
      },
      eye: {
        title: '👁️ Eye Rest',
        body: 'Look at something 20 feet away for 20 seconds.',
        action: '20-20-20 rule',
      },
      posture: {
        title: '🧘 Posture Check',
        body: 'Sit up straight. Roll your shoulders back.',
        action: 'Adjust posture',
      },
      stretch: {
        title: '🤸 Stretch Time',
        body: 'Stand up and stretch your arms, legs, and back.',
        action: 'Stretch for 2 minutes',
      },
      walk: {
        title: '🚶 Walk Break',
        body: 'Take a short 5-minute walk. Move your body!',
        action: 'Walk 5 minutes',
      },
      sleep: {
        title: '🌙 Sleep Reminder',
        body: 'It's time to wind down for better sleep.',
        action: 'Prepare for bed',
      },
    };

    const reminder = reminders[type];
    if (!reminder) return;

    this.logAction(type, 'triggered');

    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title: reminder.title,
          body: reminder.body,
          channelId: 'health_reminders',
          priority: 'low',
          ongoing: false,
        });
      }
    } catch (e) {
      console.warn('Health reminder notification failed:', e);
    }
  }

  logAction(type, action) {
    this.log.push({ type, action, timestamp: Date.now() });
    if (this.log.length > this.maxLog) this.log.shift();
    this.saveData();
  }

  async acknowledgeReminder(type) {
    this.logAction(type, 'acknowledged');
    // Reset the timer for this reminder type
    if (this.timers[type]) {
      clearInterval(this.timers[type]);
    }
    const intervalMap = {
      water: this.settings.waterBreakIntervalMinutes,
      eye: this.settings.eyeRestIntervalMinutes,
      posture: this.settings.postureCheckIntervalMinutes,
      stretch: this.settings.stretchIntervalMinutes,
      walk: this.settings.walkIntervalMinutes,
    };
    if (intervalMap[type]) {
      this.scheduleReminder(type, intervalMap[type]);
    }
  }

  getDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayLog = this.log.filter(l => new Date(l.timestamp).toISOString().split('T')[0] === today);
    const stats = {};
    ['water', 'eye', 'posture', 'stretch', 'walk', 'sleep'].forEach(type => {
      stats[type] = todayLog.filter(l => l.type === type && l.action === 'acknowledged').length;
    });
    return stats;
  }

  getWeeklyStats() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekLog = this.log.filter(l => l.timestamp > weekAgo && l.action === 'acknowledged');
    const stats = {};
    ['water', 'eye', 'posture', 'stretch', 'walk', 'sleep'].forEach(type => {
      stats[type] = weekLog.filter(l => l.type === type).length;
    });
    return stats;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveData();
    this.startAllReminders();
  }

  getSettings() {
    return this.settings;
  }
}

export default new HealthReminders();
