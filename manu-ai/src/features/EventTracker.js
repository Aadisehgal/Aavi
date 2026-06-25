import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/EventTracker.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuContactsModule, ManuNotificationManager } = NativeModules;

const EVENTS_KEY = '@manu_ai_events';
const GIFT_SUGGESTIONS_KEY = '@manu_ai_gift_suggestions';

class EventTracker {
  constructor() {
    this.events = [];
    this.giftSuggestions = {
      birthday: ['Book', 'Personalized mug', 'Gift card', 'Flowers', 'Chocolate box', 'Experience voucher'],
      anniversary: ['Photo album', 'Dinner reservation', 'Weekend getaway', 'Jewelry', 'Custom art'],
      graduation: ['Pen set', 'Laptop accessory', 'Inspirational book', 'Travel gear'],
      wedding: ['Kitchen appliance', 'Home decor', 'Cash gift', 'Wine set'],
      baby_shower: ['Diaper bag', 'Baby clothes', 'Stuffed animal', 'Parenting book'],
      general: ['Gift card', 'Flowers', 'Handwritten note', 'Coffee voucher'],
    };
    this.loadData();
  }

  async loadData() {
    try {
      const data = await AsyncStorage.getItem(EVENTS_KEY);
      if (data) this.events = JSON.parse(data);
    } catch (e) {
      console.warn('EventTracker load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.warn('EventTracker save error:', e);
    }
  }

  async syncContacts() {
    try {
      if (ManuContactsModule) {
        const contacts = await ManuContactsModule.getContactsWithBirthdays();
        for (const contact of contacts) {
          if (contact.birthday) {
            await this.addEvent({
              type: 'birthday',
              title: `${contact.name}'s Birthday`,
              personName: contact.name,
              date: this.normalizeBirthday(contact.birthday),
              source: 'contacts',
              contactId: contact.id,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Contact sync failed:', e);
    }
  }

  normalizeBirthday(birthdayString) {
    // Convert recurring birthday to next occurrence
    const now = new Date();
    const bday = new Date(birthdayString);
    const nextBirthday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    if (nextBirthday < now) {
      nextBirthday.setFullYear(now.getFullYear() + 1);
    }
    return nextBirthday.toISOString().split('T')[0];
  }

  async addEvent(event) {
    const newEvent = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: event.type || 'general',
      title: event.title,
      personName: event.personName || '',
      date: event.date,
      reminderDays: event.reminderDays || [7, 1],
      gifts: event.gifts || [],
      notes: event.notes || '',
      source: event.source || 'manual',
      contactId: event.contactId || null,
      createdAt: Date.now(),
    };

    // Check for duplicates
    const exists = this.events.find(e =>
      e.type === newEvent.type &&
      e.personName === newEvent.personName &&
      e.date === newEvent.date
    );
    if (exists) return exists;

    this.events.push(newEvent);
    await this.saveData();
    await this.scheduleReminders(newEvent);
    return newEvent;
  }

  async scheduleReminders(event) {
    const eventDate = new Date(event.date);
    for (const daysBefore of event.reminderDays) {
      const reminderDate = new Date(eventDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      const now = new Date();
      if (reminderDate > now) {
        // In production, schedule exact alarm via AlarmManager
        // For now, store and check periodically
      }
    }
  }

  async checkUpcomingEvents() {
    const now = new Date();
    const upcoming = [];
    for (const event of this.events) {
      const eventDate = new Date(event.date);
      const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        upcoming.push({ ...event, daysUntil: diffDays });
        if (event.reminderDays.includes(diffDays)) {
          await this.sendReminder(event, diffDays);
        }
      }
    }
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  async sendReminder(event, daysUntil) {
    const giftIdeas = this.suggestGifts(event.type, event.personName);
    const title = daysUntil === 0 ? `🎉 Today: ${event.title}` : `📅 ${event.title} in ${daysUntil} days`;
    const body = daysUntil === 0
      ? `Don't forget to wish ${event.personName} today!`
      : `Upcoming event. Gift ideas: ${giftIdeas.slice(0, 3).join(', ')}`;

    try {
      if (ManuNotificationManager) {
        await ManuNotificationManager.showLocalNotification({
          title,
          body,
          channelId: 'event_reminders',
          priority: 'normal',
          data: { eventId: event.id, type: 'event_reminder' },
        });
      }
    } catch (e) {
      console.warn('Event reminder failed:', e);
    }
  }

  suggestGifts(eventType, personName) {
    const base = this.giftSuggestions[eventType] || this.giftSuggestions.general;
    // In production, personalize based on past gifts and preferences
    return base;
  }

  addGiftSuggestion(eventType, suggestion) {
    if (!this.giftSuggestions[eventType]) {
      this.giftSuggestions[eventType] = [];
    }
    if (!this.giftSuggestions[eventType].includes(suggestion)) {
      this.giftSuggestions[eventType].push(suggestion);
    }
  }

  getEvents(filter = {}) {
    let filtered = this.events;
    if (filter.type) filtered = filtered.filter(e => e.type === filter.type);
    if (filter.upcoming) {
      const now = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(e => e.date >= now);
    }
    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  getEventById(id) {
    return this.events.find(e => e.id === id) || null;
  }

  async deleteEvent(id) {
    this.events = this.events.filter(e => e.id !== id);
    await this.saveData();
  }

  async updateEvent(id, updates) {
    const idx = this.events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.events[idx] = { ...this.events[idx], ...updates };
    await this.saveData();
    return this.events[idx];
  }
}

export default new EventTracker();
