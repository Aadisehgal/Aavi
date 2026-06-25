import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Contextual Reminders)
// File: src/features/ContextReminders.js
// Generated: 2026-06-24

import { NativeModules, Platform } from 'react-native';

const { LocationModule, GeofencingModule } = NativeModules;

const REMINDER_KEY = '@manu_ai_context_reminders';
const TRIGGER_LOG_KEY = '@manu_ai_reminder_triggers';

/**
 * ContextReminders creates smart reminders triggered by
 * location, time, app usage, or device state changes.
 */
class ContextReminders {
  constructor() {
    this.reminders = [];
    this.triggeredToday = new Set();
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(REMINDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.reminders = parsed.reminders || [];
      }
      // Reset daily triggers
      this.triggeredToday.clear();
    } catch (e) {
      console.warn('[ContextReminders] Init error:', e);
    }
  }

  /**
   * Create a context-aware reminder.
   * context: { type: 'location'|'time'|'app'|'battery', value, radius? }
   */
  async createReminder(title, message, context, options = {}) {
    const reminder = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      context,
      options: {
        recurring: options.recurring || false,
        snoozeMinutes: options.snoozeMinutes || 10,
        maxTriggersPerDay: options.maxTriggersPerDay || 1,
        priority: options.priority || 'normal',
        ...options,
      },
      createdAt: new Date().toISOString(),
      triggerCount: 0,
      lastTriggered: null,
      active: true,
    };

    this.reminders.push(reminder);
    await this._persistReminders();

    // Register geofence if location-based
    if (context.type === 'location' && Platform.OS === 'android' && GeofencingModule) {
      try {
        await GeofencingModule.addGeofence(
          reminder.id,
          context.value.latitude,
          context.value.longitude,
          context.radius || 100
        );
      } catch (e) {
        console.warn('[ContextReminders] Geofence error:', e);
      }
    }

    return reminder;
  }

  /**
   * Check all reminders against current context.
   */
  async checkContext(context) {
    const triggered = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const reminder of this.reminders) {
      if (!reminder.active) continue;
      if (this.triggeredToday.has(`${reminder.id}_${today}`)) continue;

      const shouldTrigger = this._evaluateContext(reminder.context, context);
      if (shouldTrigger) {
        const dailyCount = await this._getDailyTriggerCount(reminder.id, today);
        if (dailyCount < reminder.options.maxTriggersPerDay) {
          triggered.push(reminder);
          this.triggeredToday.add(`${reminder.id}_${today}`);
          await this._logTrigger(reminder, context);
          reminder.triggerCount += 1;
          reminder.lastTriggered = now.toISOString();
        }
      }
    }

    if (triggered.length > 0) {
      await this._persistReminders();
    }

    return triggered;
  }

  /**
   * Get all active reminders.
   */
  async getReminders() {
    return this.reminders.filter(r => r.active);
  }

  /**
   * Get reminders by context type.
   */
  async getRemindersByType(type) {
    return this.reminders.filter(r => r.context.type === type && r.active);
  }

  /**
   * Deactivate a reminder.
   */
  async deactivateReminder(reminderId) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (reminder) {
      reminder.active = false;
      await this._persistReminders();

      if (reminder.context.type === 'location' && Platform.OS === 'android' && GeofencingModule) {
        try {
          await GeofencingModule.removeGeofence(reminderId);
        } catch (e) {
          console.warn('[ContextReminders] Remove geofence error:', e);
        }
      }
    }
  }

  /**
   * Reactivate a reminder.
   */
  async reactivateReminder(reminderId) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (reminder) {
      reminder.active = true;
      await this._persistReminders();
    }
  }

  /**
   * Delete a reminder permanently.
   */
  async deleteReminder(reminderId) {
    await this.deactivateReminder(reminderId);
    this.reminders = this.reminders.filter(r => r.id !== reminderId);
    await this._persistReminders();
  }

  /**
   * Snooze a triggered reminder.
   */
  async snoozeReminder(reminderId) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const snoozeKey = `${reminderId}_snooze`;
    const snoozeUntil = Date.now() + (reminder.options.snoozeMinutes * 60 * 1000);
    await AsyncStorage.setItem(snoozeKey, snoozeUntil.toString());
  }

  /**
   * Create common preset reminders.
   */
  async createPresets() {
    const presets = [
      {
        title: 'Umbrella Check',
        message: 'It looks like rain today. Don't forget your umbrella!',
        context: { type: 'weather', condition: 'rain' },
        options: { recurring: true, maxTriggersPerDay: 1, priority: 'low' },
      },
      {
        title: 'Water Reminder',
        message: 'Time to drink some water and stay hydrated.',
        context: { type: 'time', value: '14:00' },
        options: { recurring: true, maxTriggersPerDay: 3, priority: 'low' },
      },
      {
        title: 'Study Break',
        message: 'You've been studying for a while. Take a 5-minute break.',
        context: { type: 'app', value: 'study_mode', duration: 45 },
        options: { recurring: true, maxTriggersPerDay: 5, priority: 'normal' },
      },
      {
        title: 'Low Battery Alert',
        message: 'Battery is low. Consider enabling power saver or charging soon.',
        context: { type: 'battery', threshold: 20 },
        options: { recurring: true, maxTriggersPerDay: 2, priority: 'high' },
      },
    ];

    for (const preset of presets) {
      const exists = this.reminders.find(r => r.title === preset.title);
      if (!exists) {
        await this.createReminder(preset.title, preset.message, preset.context, preset.options);
      }
    }
  }

  // --- Private helpers ---

  _evaluateContext(reminderContext, currentContext) {
    switch (reminderContext.type) {
      case 'location':
        if (!currentContext.location) return false;
        const distance = this._haversineDistance(
          currentContext.location.latitude,
          currentContext.location.longitude,
          reminderContext.value.latitude,
          reminderContext.value.longitude
        );
        return distance <= (reminderContext.radius || 100);

      case 'time':
        if (!currentContext.time) return false;
        return currentContext.time === reminderContext.value;

      case 'app':
        if (!currentContext.app) return false;
        return currentContext.app === reminderContext.value;

      case 'battery':
        if (currentContext.batteryLevel === undefined) return false;
        return currentContext.batteryLevel <= reminderContext.threshold;

      case 'weather':
        if (!currentContext.weather) return false;
        return currentContext.weather.condition === reminderContext.condition;

      default:
        return false;
    }
  }

  _haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async _getDailyTriggerCount(reminderId, date) {
    try {
      const stored = await AsyncStorage.getItem(TRIGGER_LOG_KEY);
      if (!stored) return 0;
      const logs = JSON.parse(stored);
      return logs.filter(l => l.reminderId === reminderId && l.date === date).length;
    } catch (e) {
      return 0;
    }
  }

  async _logTrigger(reminder, context) {
    try {
      const stored = await AsyncStorage.getItem(TRIGGER_LOG_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      logs.push({
        reminderId: reminder.id,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        contextType: reminder.context.type,
      });
      if (logs.length > 500) logs.shift();
      await AsyncStorage.setItem(TRIGGER_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('[ContextReminders] Log error:', e);
    }
  }

  async _persistReminders() {
    try {
      await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify({
        reminders: this.reminders,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[ContextReminders] Persist error:', e);
    }
  }

  async reset() {
    this.reminders = [];
    this.triggeredToday.clear();
    await AsyncStorage.multiRemove([REMINDER_KEY, TRIGGER_LOG_KEY]);
  }
}

export default new ContextReminders();
