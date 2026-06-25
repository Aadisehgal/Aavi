import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/AmbientAwareness.js
// Generated: 2026-06-24

import { NativeModules, AppState, Dimensions } from 'react-native';

const { ManuLocationModule, ManuActivityModule, ManuSensorModule } = NativeModules;

const AMBIENT_KEY = '@manu_ai_ambient_context';
const CONTEXT_HISTORY_KEY = '@manu_ai_context_history';

class AmbientAwareness {
  constructor() {
    this.context = {
      time: null,
      location: null,
      activity: null,
      app: null,
      screen: null,
      sensors: null,
    };
    this.history = [];
    this.maxHistory = 100;
    this.listeners = [];
    this.updateInterval = null;
    this.loadContext();
  }

  async loadContext() {
    try {
      const data = await AsyncStorage.getItem(AMBIENT_KEY);
      if (data) this.context = JSON.parse(data);
      const hist = await AsyncStorage.getItem(CONTEXT_HISTORY_KEY);
      if (hist) this.history = JSON.parse(hist);
    } catch (e) {
      console.warn('AmbientAwareness load error:', e);
    }
  }

  async saveContext() {
    try {
      await AsyncStorage.setItem(AMBIENT_KEY, JSON.stringify(this.context));
      await AsyncStorage.setItem(CONTEXT_HISTORY_KEY, JSON.stringify(this.history.slice(-this.maxHistory)));
    } catch (e) {
      console.warn('AmbientAwareness save error:', e);
    }
  }

  startMonitoring(intervalMs = 60000) {
    if (this.updateInterval) return;
    this.updateContext();
    this.updateInterval = setInterval(() => this.updateContext(), intervalMs);
  }

  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateContext() {
    const timeContext = this.getTimeContext();
    const locationContext = await this.getLocationContext();
    const activityContext = await this.getActivityContext();
    const appContext = this.getAppContext();
    const screenContext = this.getScreenContext();
    const sensorContext = await this.getSensorContext();

    const newContext = {
      time: timeContext,
      location: locationContext,
      activity: activityContext,
      app: appContext,
      screen: screenContext,
      sensors: sensorContext,
      updatedAt: Date.now(),
    };

    this.context = newContext;
    this.history.push({ ...newContext, recordedAt: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    await this.saveContext();
    this.notifyListeners(newContext);
    return newContext;
  }

  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay;
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      hour,
      minute: now.getMinutes(),
      dayOfWeek,
      isWeekend,
      timeOfDay,
      dateString: now.toISOString().split('T')[0],
    };
  }

  async getLocationContext() {
    try {
      if (ManuLocationModule) {
        const loc = await ManuLocationModule.getLastKnownLocation();
        const places = await this.getNearbyPlaces(loc.latitude, loc.longitude);
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          placeType: places.primary,
          placeName: places.name,
          isHome: places.primary === 'home',
          isWork: places.primary === 'work',
          isCommute: places.primary === 'commute',
        };
      }
    } catch (e) {
      // Fallback
    }
    return { latitude: null, longitude: null, accuracy: null, placeType: 'unknown', isHome: false, isWork: false };
  }

  async getNearbyPlaces(lat, lng) {
    // In production, uses geofencing data from Settings
    // For now, returns based on saved home/work coordinates
    try {
      const homeData = await AsyncStorage.getItem('@manu_ai_home_location');
      const workData = await AsyncStorage.getItem('@manu_ai_work_location');
      if (homeData && lat && lng) {
        const home = JSON.parse(homeData);
        const dist = this.haversine(lat, lng, home.lat, home.lng);
        if (dist < 0.1) return { primary: 'home', name: 'Home' };
      }
      if (workData && lat && lng) {
        const work = JSON.parse(workData);
        const dist = this.haversine(lat, lng, work.lat, work.lng);
        if (dist < 0.1) return { primary: 'work', name: 'Work' };
      }
    } catch (e) {}
    return { primary: 'unknown', name: 'Unknown' };
  }

  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async getActivityContext() {
    try {
      if (ManuActivityModule) {
        const activity = await ManuActivityModule.getCurrentActivity();
        return {
          type: activity.type || 'unknown',
          confidence: activity.confidence || 0,
          isMoving: ['WALKING', 'RUNNING', 'IN_VEHICLE', 'ON_BICYCLE'].includes(activity.type),
          isStationary: activity.type === 'STILL',
        };
      }
    } catch (e) {}
    return { type: 'unknown', confidence: 0, isMoving: false, isStationary: true };
  }

  getAppContext() {
    return {
      appState: AppState.currentState,
      currentApp: null, // Would be filled by Android UsageStats
      screenDimensions: Dimensions.get('window'),
    };
  }

  getScreenContext() {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isPortrait: height > width,
      scale: Dimensions.get('window').scale,
    };
  }

  async getSensorContext() {
    try {
      if (ManuSensorModule) {
        const sensors = await ManuSensorModule.getSensorSnapshot();
        return {
          light: sensors.light || 0,
          proximity: sensors.proximity || 0,
          accelerometer: sensors.accelerometer || { x: 0, y: 0, z: 0 },
          isInPocket: sensors.proximity === 0 && sensors.light < 10,
          isOnTable: sensors.accelerometer && Math.abs(sensors.accelerometer.z - 9.8) < 1 && sensors.light < 50,
        };
      }
    } catch (e) {}
    return { light: 0, proximity: 0, isInPocket: false, isOnTable: false };
  }

  getContext() {
    return this.context;
  }

  getHistory() {
    return this.history;
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(context) {
    this.listeners.forEach(cb => {
      try { cb(context); } catch (e) {}
    });
  }

  inferUserSituation() {
    const ctx = this.context;
    if (!ctx.time || !ctx.location || !ctx.activity) return 'unknown';

    if (ctx.time.isWeekend && ctx.location.isHome && ctx.activity.isStationary) {
      return 'weekend_relaxing';
    }
    if (ctx.time.timeOfDay === 'morning' && ctx.activity.isMoving && !ctx.location.isHome) {
      return 'morning_commute';
    }
    if (ctx.location.isWork && ctx.activity.isStationary && ctx.time.timeOfDay === 'afternoon') {
      return 'working';
    }
    if (ctx.time.timeOfDay === 'night' && ctx.location.isHome) {
      return 'evening_wind_down';
    }
    if (ctx.activity.isMoving && ctx.time.timeOfDay === 'evening') {
      return 'evening_commute';
    }
    return 'general';
  }
}

export default new AmbientAwareness();
