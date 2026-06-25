import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/TravelCalc.js
// Generated: 2026-06-24

import { NativeModules} from 'react-native';

const { ManuLocationModule } = NativeModules;

const TRAVEL_HISTORY_KEY = '@manu_ai_travel_history';
const ROUTE_CACHE_KEY = '@manu_ai_route_cache';

class TravelCalc {
  constructor() {
    this.history = [];
    this.routeCache = {};
    this.maxHistory = 100;
    this.loadData();
  }

  async loadData() {
    try {
      const h = await AsyncStorage.getItem(TRAVEL_HISTORY_KEY);
      if (h) this.history = JSON.parse(h);
      const c = await AsyncStorage.getItem(ROUTE_CACHE_KEY);
      if (c) this.routeCache = JSON.parse(c);
    } catch (e) {
      console.warn('TravelCalc load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(TRAVEL_HISTORY_KEY, JSON.stringify(this.history.slice(-this.maxHistory)));
      await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(this.routeCache));
    } catch (e) {
      console.warn('TravelCalc save error:', e);
    }
  }

  async calculateTravelTime(origin, destination, mode = 'driving') {
    if (!origin || !destination) {
      return { durationMinutes: 0, distanceKm: 0, mode, error: 'Invalid origin or destination' };
    }

    const cacheKey = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${mode}`;
    const cached = this.routeCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.result;
    }

    // Use built-in fetch to call routing API (URL from settings, no hardcoded key)
    const apiUrl = await this.getRoutingApiUrl();
    let result;

    try {
      if (apiUrl) {
        const url = `${apiUrl}?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}`;
        const response = await fetch(url, { timeout: 10000 });
        const data = await response.json();
        result = this.parseRoutingResponse(data, mode);
      } else {
        // Fallback: haversine distance with speed estimates
        result = this.estimateFromDistance(origin, destination, mode);
      }
    } catch (e) {
      result = this.estimateFromDistance(origin, destination, mode);
    }

    // Adjust based on time of day
    const adjusted = this.applyTrafficAdjustment(result, mode);

    this.routeCache[cacheKey] = { result: adjusted, timestamp: Date.now() };
    await this.saveData();
    return adjusted;
  }

  async getRoutingApiUrl() {
    try {
      return await AsyncStorage.getItem('@manu_ai_routing_api_url');
    } catch (e) {
      return null;
    }
  }

  parseRoutingResponse(data, mode) {
    if (data && data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
      const leg = data.routes[0].legs[0];
      return {
        durationMinutes: Math.round(leg.duration.value / 60),
        distanceKm: parseFloat((leg.distance.value / 1000).toFixed(1)),
        mode,
        source: 'api',
      };
    }
    return { durationMinutes: 0, distanceKm: 0, mode, source: 'api', error: 'Invalid response' };
  }

  estimateFromDistance(origin, destination, mode) {
    const distanceKm = this.haversine(origin.lat, origin.lng, destination.lat, destination.lng);
    const speeds = { driving: 30, walking: 5, bicycling: 15, transit: 25 };
    const speed = speeds[mode] || 30;
    const durationMinutes = Math.round((distanceKm / speed) * 60);
    return {
      durationMinutes,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      mode,
      source: 'estimate',
    };
  }

  applyTrafficAdjustment(result, mode) {
    if (mode !== 'driving') return result;
    const hour = new Date().getHours();
    let multiplier = 1.0;

    // Rush hour adjustments
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
      multiplier = 1.5;
    } else if (hour >= 22 || hour <= 5) {
      multiplier = 0.9;
    }

    return {
      ...result,
      durationMinutes: Math.round(result.durationMinutes * multiplier),
      trafficMultiplier: multiplier,
      leaveBy: this.calculateLeaveBy(result.durationMinutes * multiplier),
    };
  }

  calculateLeaveBy(durationMinutes) {
    const now = Date.now();
    return new Date(now + durationMinutes * 60000).toISOString();
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

  async recordTrip(origin, destination, mode, actualDurationMinutes) {
    const trip = {
      origin,
      destination,
      mode,
      actualDurationMinutes,
      estimatedDurationMinutes: null,
      timestamp: Date.now(),
      dayOfWeek: new Date().getDay(),
      hour: new Date().getHours(),
    };
    this.history.push(trip);
    if (this.history.length > this.maxHistory) this.history.shift();
    await this.saveData();
  }

  getAverageTripTime(destinationIdentifier, mode = 'driving', hours = 168) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const trips = this.history.filter(t =>
      t.timestamp > cutoff &&
      t.mode === mode &&
      (t.destination.name === destinationIdentifier || t.destination.lat === destinationIdentifier.lat)
    );
    if (trips.length === 0) return null;
    const avg = trips.reduce((sum, t) => sum + t.actualDurationMinutes, 0) / trips.length;
    return Math.round(avg);
  }

  async getCurrentLocation() {
    try {
      if (ManuLocationModule) {
        return await ManuLocationModule.getCurrentLocation();
      }
    } catch (e) {}
    return { lat: 0, lng: 0 };
  }

  async suggestLeaveByTime(destination, arrivalTime, mode = 'driving') {
    const currentLoc = await this.getCurrentLocation();
    const result = await this.calculateTravelTime(currentLoc, destination, mode);
    const arrivalTs = new Date(arrivalTime).getTime();
    const leaveByTs = arrivalTs - result.durationMinutes * 60000;
    const bufferMinutes = 10;
    return {
      leaveBy: new Date(leaveByTs - bufferMinutes * 60000).toISOString(),
      travelTimeMinutes: result.durationMinutes,
      bufferMinutes,
      arrivalTime,
      mode,
    };
  }
}

export default new TravelCalc();
