// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/WeatherSuggest.js
// Generated: 2026-06-24

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY = '@manu_ai_weather_cache';
const WEATHER_SETTINGS_KEY = '@manu_ai_weather_settings';

class WeatherSuggest {
  constructor() {
    this.cache = null;
    this.settings = {
      apiUrl: null,
      unit: 'metric', // metric or imperial
      alertThresholds: {
        highTemp: 35,
        lowTemp: 5,
        rainProbability: 60,
        windSpeed: 50,
      },
    };
    this.loadData();
  }

  async loadData() {
    try {
      const c = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (c) this.cache = JSON.parse(c);
      const s = await AsyncStorage.getItem(WEATHER_SETTINGS_KEY);
      if (s) this.settings = { ...this.settings, ...JSON.parse(s) };
    } catch (e) {
      console.warn('WeatherSuggest load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(this.cache));
      await AsyncStorage.setItem(WEATHER_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('WeatherSuggest save error:', e);
    }
  }

  async fetchWeather(lat, lng) {
    if (!lat || !lng) {
      return { error: 'Location not available', suggestions: [] };
    }

    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (this.cache && this.cache.key === cacheKey && Date.now() - this.cache.timestamp < 600000) {
      return this.generateSuggestions(this.cache.data);
    }

    const apiUrl = this.settings.apiUrl;
    if (!apiUrl) {
      return { error: 'Weather API URL not configured. Please set in Settings.', suggestions: [] };
    }

    try {
      const url = `${apiUrl}?lat=${lat}&lon=${lng}&units=${this.settings.unit}`;
      const response = await fetch(url, { timeout: 15000 });
      const data = await response.json();
      this.cache = { key: cacheKey, data, timestamp: Date.now() };
      await this.saveData();
      return this.generateSuggestions(data);
    } catch (e) {
      return { error: 'Failed to fetch weather data', suggestions: [] };
    }
  }

  generateSuggestions(weatherData) {
    if (!weatherData || !weatherData.main || !weatherData.weather) {
      return { error: 'Invalid weather data', suggestions: [] };
    }

    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind ? weatherData.wind.speed : 0;
    const condition = weatherData.weather[0].main.toLowerCase();
    const description = weatherData.weather[0].description;
    const rainProb = weatherData.rain ? (weatherData.rain['1h'] || 0) : 0;

    const suggestions = [];
    const alerts = [];

    // Temperature-based suggestions
    if (temp > this.settings.alertThresholds.highTemp) {
      alerts.push(`High temperature: ${temp}°C. Stay hydrated.`);
      suggestions.push('Carry water bottle');
      suggestions.push('Wear light-colored clothing');
      suggestions.push('Avoid prolonged sun exposure');
    } else if (temp < this.settings.alertThresholds.lowTemp) {
      alerts.push(`Low temperature: ${temp}°C. Dress warmly.`);
      suggestions.push('Wear layers');
      suggestions.push('Carry a jacket');
    }

    // Rain suggestions
    if (condition.includes('rain') || condition.includes('drizzle') || rainProb > 0) {
      suggestions.push('Take an umbrella');
      suggestions.push('Wear waterproof footwear');
      if (rainProb > this.settings.alertThresholds.rainProbability / 100) {
        alerts.push('Heavy rain expected. Consider indoor activities.');
      }
    }

    // Wind suggestions
    if (windSpeed > this.settings.alertThresholds.windSpeed / 3.6) { // m/s threshold
      suggestions.push('Secure loose items outdoors');
      alerts.push('Strong winds detected.');
    }

    // General condition suggestions
    if (condition.includes('clear') || condition.includes('sun')) {
      suggestions.push('Good weather for outdoor activities');
      if (temp > 25) suggestions.push('Apply sunscreen');
    }
    if (condition.includes('cloud')) {
      suggestions.push('Pleasant weather — good for walking');
    }
    if (condition.includes('snow') || condition.includes('ice')) {
      suggestions.push('Drive carefully — roads may be slippery');
      suggestions.push('Wear boots with good grip');
    }
    if (condition.includes('fog') || condition.includes('mist')) {
      suggestions.push('Use fog lights while driving');
      suggestions.push('Reduce driving speed');
    }

    // Humidity-based
    if (humidity > 80) {
      suggestions.push('High humidity — stay cool');
    }

    // Activity suggestions based on time
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 9 && condition.includes('clear')) {
      suggestions.push('Great morning for a jog');
    }

    return {
      current: {
        temp,
        humidity,
        windSpeed,
        condition: description,
      },
      alerts,
      suggestions: [...new Set(suggestions)],
      clothing: this.suggestClothing(temp, condition),
      travelImpact: this.assessTravelImpact(condition, windSpeed, rainProb),
    };
  }

  suggestClothing(temp, condition) {
    if (temp > 30) return 'T-shirt, shorts, sunglasses';
    if (temp > 20) return 'Light shirt, comfortable pants';
    if (temp > 10) return 'Long sleeves, light jacket';
    if (temp > 0) return 'Warm jacket, scarf, gloves';
    return 'Heavy winter coat, thermal layers, boots';
  }

  assessTravelImpact(condition, windSpeed, rainProb) {
    let impact = 'low';
    if (condition.includes('snow') || condition.includes('ice')) impact = 'high';
    else if (condition.includes('rain') && rainProb > 0.5) impact = 'medium';
    else if (windSpeed > 15) impact = 'medium';
    else if (condition.includes('fog')) impact = 'medium';

    return {
      level: impact,
      advice: impact === 'high' ? 'Consider delaying non-essential travel' :
              impact === 'medium' ? 'Allow extra travel time' :
              'Normal travel conditions',
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveData();
  }

  getSettings() {
    return this.settings;
  }
}

export default new WeatherSuggest();
