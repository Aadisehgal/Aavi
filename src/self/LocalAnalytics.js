import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 17/20 — Self-Evolution Features 101-125
// File: src/self/LocalAnalytics.js
// Generated: 2026-06-24
// Feature 121: Usage Analytics Local — Privacy-first usage stats



const ANALYTICS_DATA_KEY = '@manu_ai/analytics_data';
const ANALYTICS_CONFIG_KEY = '@manu_ai/analytics_config';

const DEFAULT_CONFIG = {
  enabled: true,
  anonymize: true,
  retentionDays: 90,
  sampleRate: 1.0, // 1.0 = 100%
  trackScreens: true,
  trackActions: true,
  trackPerformance: true,
  trackErrors: true,
};

class LocalAnalytics {
  constructor() {
    this.events = [];
    this.sessions = [];
    this.config = { ...DEFAULT_CONFIG };
    this.currentSession = null;
    this.init();
  }

  async init() {
    await this.loadConfig();
    await this.loadData();
    this.startSession();
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem(ANALYTICS_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {}
  }

  async loadData() {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_DATA_KEY);
      const data = stored ? JSON.parse(stored) : { events: [], sessions: [] };
      this.events = data.events || [];
      this.sessions = data.sessions || [];
    } catch (e) {
      this.events = [];
      this.sessions = [];
    }
  }

  async saveData() {
    try {
      const data = {
        events: this.events.slice(-1000),
        sessions: this.sessions.slice(-100),
      };
      await AsyncStorage.setItem(ANALYTICS_DATA_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  startSession() {
    this.currentSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      startTime: Date.now(),
      screenViews: [],
      actions: [],
      events: [],
    };
  }

  endSession() {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.sessions.push(this.currentSession);
    this.currentSession = null;
    this.saveData();
  }

  async trackEvent(eventName, properties = {}) {
    if (!this.config.enabled) return;
    if (Math.random() > this.config.sampleRate) return;

    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: eventName,
      timestamp: Date.now(),
      properties: this.config.anonymize ? this.anonymizeProperties(properties) : properties,
      sessionId: this.currentSession?.id,
    };

    this.events.push(event);
    if (this.currentSession) {
      this.currentSession.events.push(event.id);
    }

    await this.saveData();
  }

  async trackScreenView(screenName, properties = {}) {
    if (!this.config.trackScreens) return;

    const view = {
      screenName,
      timestamp: Date.now(),
      duration: 0,
    };

    // Calculate duration of previous screen
    if (this.currentSession && this.currentSession.screenViews.length > 0) {
      const lastView = this.currentSession.screenViews[this.currentSession.screenViews.length - 1];
      lastView.duration = view.timestamp - lastView.timestamp;
    }

    if (this.currentSession) {
      this.currentSession.screenViews.push(view);
    }

    await this.trackEvent('SCREEN_VIEW', { screenName, ...properties });
  }

  async trackAction(actionName, properties = {}) {
    if (!this.config.trackActions) return;

    const action = {
      actionName,
      timestamp: Date.now(),
    };

    if (this.currentSession) {
      this.currentSession.actions.push(action);
    }

    await this.trackEvent('ACTION', { actionName, ...properties });
  }

  async trackPerformance(metricName, value, properties = {}) {
    if (!this.config.trackPerformance) return;

    await this.trackEvent('PERFORMANCE', {
      metricName,
      value,
      ...properties,
    });
  }

  async trackError(error, properties = {}) {
    if (!this.config.trackErrors) return;

    await this.trackEvent('ERROR', {
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack || '',
      ...properties,
    });
  }

  anonymizeProperties(properties) {
    const anonymized = { ...properties };
    const sensitiveKeys = ['userId', 'email', 'phone', 'name', 'location', 'deviceId'];
    sensitiveKeys.forEach(key => {
      if (anonymized[key]) {
        anonymized[key] = this.hashValue(anonymized[key]);
      }
    });
    return anonymized;
  }

  hashValue(value) {
    const str = String(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  async getAnalyticsSummary() {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;

    const dayEvents = this.events.filter(e => e.timestamp > dayAgo);
    const weekEvents = this.events.filter(e => e.timestamp > weekAgo);

    const screenViews = this.events.filter(e => e.name === 'SCREEN_VIEW');
    const actions = this.events.filter(e => e.name === 'ACTION');
    const errors = this.events.filter(e => e.name === 'ERROR');
    const performance = this.events.filter(e => e.name === 'PERFORMANCE');

    const topScreens = {};
    screenViews.forEach(e => {
      const name = e.properties?.screenName || 'unknown';
      if (!topScreens[name]) topScreens[name] = 0;
      topScreens[name] += 1;
    });

    return {
      totalEvents: this.events.length,
      totalSessions: this.sessions.length,
      dayEvents: dayEvents.length,
      weekEvents: weekEvents.length,
      screenViews: screenViews.length,
      actions: actions.length,
      errors: errors.length,
      performanceMetrics: performance.length,
      averageSessionDuration: this.sessions.length > 0
        ? this.sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / this.sessions.length
        : 0,
      topScreens: Object.entries(topScreens)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  }

  async getEvents(filter = {}) {
    let events = [...this.events];
    if (filter.name) events = events.filter(e => e.name === filter.name);
    if (filter.since) events = events.filter(e => e.timestamp >= filter.since);
    if (filter.until) events = events.filter(e => e.timestamp <= filter.until);
    return events.slice(-(filter.limit || 100));
  }

  async cleanupOldData() {
    const cutoff = Date.now() - (this.config.retentionDays * 86400000);
    this.events = this.events.filter(e => e.timestamp > cutoff);
    this.sessions = this.sessions.filter(s => s.startTime > cutoff);
    await this.saveData();
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  async getConfig() {
    return { ...this.config };
  }

  async exportAnalytics() {
    return {
      exportDate: Date.now(),
      config: this.config,
      summary: await this.getAnalyticsSummary(),
      events: this.events,
      sessions: this.sessions,
    };
  }

  async clearAllData() {
    this.events = [];
    this.sessions = [];
    this.currentSession = null;
    await AsyncStorage.removeItem(ANALYTICS_DATA_KEY);
  }
}

export default new LocalAnalytics();
