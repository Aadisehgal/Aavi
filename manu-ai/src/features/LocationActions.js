import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/LocationActions.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuLocationModule, ManuSettingsModule, ManuAudioManager } = NativeModules;

const LOCATION_ACTIONS_KEY = '@manu_ai_location_actions';
const LOCATION_HISTORY_KEY = '@manu_ai_location_history';

class LocationActions {
  constructor() {
    this.rules = [
      {
        id: 'home_wifi',
        name: 'Home → WiFi On',
        locationType: 'home',
        action: 'wifi_on',
        enabled: true,
      },
      {
        id: 'work_silent',
        name: 'Office → Silent Mode',
        locationType: 'work',
        action: 'silent_mode',
        enabled: true,
      },
      {
        id: 'commute_music',
        name: 'Commute → Music Suggest',
        locationType: 'commute',
        action: 'suggest_music',
        enabled: false,
      },
      {
        id: 'gym_workout',
        name: 'Gym → Workout Mode',
        locationType: 'gym',
        action: 'workout_mode',
        enabled: false,
      },
    ];
    this.locationHistory = [];
    this.maxHistory = 100;
    this.currentLocation = null;
    this.loadData();
  }

  async loadData() {
    try {
      const r = await AsyncStorage.getItem(LOCATION_ACTIONS_KEY);
      if (r) this.rules = JSON.parse(r);
      const h = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
      if (h) this.locationHistory = JSON.parse(h);
    } catch (e) {
      console.warn('LocationActions load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(LOCATION_ACTIONS_KEY, JSON.stringify(this.rules));
      await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(this.locationHistory.slice(-this.maxHistory)));
    } catch (e) {
      console.warn('LocationActions save error:', e);
    }
  }

  async updateLocation() {
    try {
      if (ManuLocationModule) {
        const loc = await ManuLocationModule.getLastKnownLocation();
        this.currentLocation = loc;
        const placeType = await this.determinePlaceType(loc);
        this.recordLocation(loc, placeType);
        await this.evaluateRules(placeType, loc);
        return { location: loc, placeType };
      }
    } catch (e) {
      console.warn('Location update failed:', e);
    }
    return null;
  }

  async determinePlaceType(loc) {
    if (!loc) return 'unknown';

    const homeData = await AsyncStorage.getItem('@manu_ai_home_location');
    const workData = await AsyncStorage.getItem('@manu_ai_work_location');

    if (homeData) {
      const home = JSON.parse(homeData);
      if (this.isNear(loc, home)) return 'home';
    }
    if (workData) {
      const work = JSON.parse(workData);
      if (this.isNear(loc, work)) return 'work';
    }

    // Speed-based inference
    if (loc.speed > 5) return 'commute';

    return 'unknown';
  }

  isNear(loc1, loc2, thresholdKm = 0.1) {
    return this.haversine(loc1.latitude, loc1.longitude, loc2.lat, loc2.lng) <= thresholdKm;
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

  recordLocation(loc, placeType) {
    this.locationHistory.push({
      latitude: loc.latitude,
      longitude: loc.longitude,
      placeType,
      timestamp: Date.now(),
    });
    if (this.locationHistory.length > this.maxHistory) {
      this.locationHistory.shift();
    }
    this.saveData();
  }

  async evaluateRules(placeType, loc) {
    const activeRules = this.rules.filter(r => r.enabled && r.locationType === placeType);
    for (const rule of activeRules) {
      await this.executeAction(rule.action, loc);
    }
  }

  async executeAction(action, loc) {
    try {
      switch (action) {
        case 'wifi_on':
          if (ManuSettingsModule) await ManuSettingsModule.setWifiEnabled(true);
          break;
        case 'wifi_off':
          if (ManuSettingsModule) await ManuSettingsModule.setWifiEnabled(false);
          break;
        case 'silent_mode':
          if (ManuAudioManager) await ManuAudioManager.setRingerMode('SILENT');
          break;
        case 'vibrate_mode':
          if (ManuAudioManager) await ManuAudioManager.setRingerMode('VIBRATE');
          break;
        case 'normal_mode':
          if (ManuAudioManager) await ManuAudioManager.setRingerMode('NORMAL');
          break;
        case 'suggest_music':
          // Broadcast to music module
          break;
        case 'workout_mode':
          // Enable do not disturb, start workout tracking
          break;
        case 'brightness_auto':
          if (ManuSettingsModule) await ManuSettingsModule.setBrightnessMode('auto');
          break;
        case 'brightness_max':
          if (ManuSettingsModule) await ManuSettingsModule.setBrightness(255);
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn(`Location action ${action} failed:`, e);
    }
  }

  addRule(rule) {
    const newRule = {
      id: rule.id || `rule_${Date.now()}`,
      name: rule.name,
      locationType: rule.locationType,
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

  getLocationHistory() {
    return this.locationHistory;
  }

  getCurrentLocation() {
    return this.currentLocation;
  }
}

export default new LocationActions();
