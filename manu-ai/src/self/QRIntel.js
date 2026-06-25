// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — QR Code Intelligence
// File: src/self/QRIntel.js
// Generated: 2026-06-25

import { NativeModules, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { CameraModule } = NativeModules;

class QRIntel {
  constructor() {
    this.scanHistory = [];
    this.threatPatterns = [
      { pattern: /javascript:/i, threat: 'xss', severity: 'critical', message: 'JavaScript URL detected — XSS risk' },
      { pattern: /data:text\/html/i, threat: 'data_uri', severity: 'high', message: 'Data URI containing HTML detected' },
      { pattern: /^(http:)/i, threat: 'insecure', severity: 'medium', message: 'Insecure HTTP URL detected' },
      { pattern: /\.apk$/i, threat: 'apk_download', severity: 'high', message: 'APK download link detected' },
      { pattern: /\.exe$/i, threat: 'exe_download', severity: 'high', message: 'Executable download link detected' },
      { pattern: /tel:/i, threat: 'phone_call', severity: 'low', message: 'Will initiate phone call' },
      { pattern: /smsto:/i, threat: 'sms', severity: 'medium', message: 'Will send SMS' },
      { pattern: /wifi:/i, threat: 'wifi_config', severity: 'low', message: 'WiFi configuration QR' },
      { pattern: /bitcoin:/i, threat: 'crypto', severity: 'low', message: 'Cryptocurrency address detected' },
      { pattern: /upi:\/\/pay/i, threat: 'payment', severity: 'medium', message: 'UPI payment link detected' },
    ];
  }

  async init() {
    await this.loadHistory();
    return true;
  }

  async loadHistory() {
    try {
      const stored = await AsyncStorage.getItem('@manu_qr_history');
      if (stored) this.scanHistory = JSON.parse(stored);
    } catch (e) {}
  }

  async saveHistory() {
    try {
      await AsyncStorage.setItem('@manu_qr_history', JSON.stringify(this.scanHistory.slice(-100)));
    } catch (e) {}
  }

  async scan(data) {
    const result = { raw: data, timestamp: Date.now(), type: 'unknown', parsed: null, safety: { safe: true, threats: [], score: 100 }, action: null };
    result.parsed = this.parseQRData(data);
    result.type = result.parsed.type;
    result.safety = await this.analyzeSafety(data);
    result.action = this.determineAction(result);
    this.scanHistory.push(result);
    await this.saveHistory();
    return result;
  }

  parseQRData(data) {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return { type: 'url', url: data };
    }
    if (data.startsWith('WIFI:')) {
      const params = {};
      data.slice(5).split(';').forEach(pair => {
        const [k, v] = pair.split(':');
        if (k && v) params[k] = v;
      });
      return { type: 'wifi', ssid: params.S, password: params.P, encryption: params.T };
    }
    if (data.startsWith('tel:') || data.startsWith('TEL:')) {
      return { type: 'phone', number: data.replace(/^tel:/i, '') };
    }
    if (data.startsWith('smsto:') || data.startsWith('SMSTO:')) {
      const parts = data.split(':');
      return { type: 'sms', number: parts[1], body: parts[2] || '' };
    }
    if (data.startsWith('mailto:')) {
      return { type: 'email', address: data.replace(/^mailto:/, '') };
    }
    if (data.startsWith('BEGIN:VCARD')) {
      return { type: 'vcard', raw: data };
    }
    if (data.startsWith('bitcoin:')) {
      return { type: 'bitcoin', address: data.replace(/^bitcoin:/, '') };
    }
    if (data.startsWith('upi://')) {
      return { type: 'upi', url: data };
    }
    if (data.startsWith('geo:')) {
      const coords = data.replace(/^geo:/, '').split(',');
      return { type: 'geo', lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) };
    }
    return { type: 'text', content: data };
  }

  async analyzeSafety(data) {
    const safety = { safe: true, threats: [], score: 100 };
    for (const threat of this.threatPatterns) {
      if (threat.pattern.test(data)) {
        safety.safe = false;
        safety.threats.push({ type: threat.threat, severity: threat.severity, message: threat.message });
        const penalty = threat.severity === 'critical' ? 50 : threat.severity === 'high' ? 30 : threat.severity === 'medium' ? 15 : 5;
        safety.score -= penalty;
      }
    }
    if (data.startsWith('http')) {
      try {
        const url = new URL(data);
        const suspicious = ['bit.ly', 'tinyurl', 't.co', 'goo.gl', 'short.link'];
        if (suspicious.some(s => url.hostname.includes(s))) {
          safety.safe = false;
          safety.threats.push({ type: 'short_url', severity: 'medium', message: 'Shortened URL — destination hidden' });
          safety.score -= 15;
        }
        if (url.hostname.includes('192.168.') || url.hostname.includes('10.') || url.hostname.includes('172.')) {
          safety.safe = false;
          safety.threats.push({ type: 'private_ip', severity: 'medium', message: 'Points to private IP address' });
          safety.score -= 15;
        }
      } catch (e) {}
    }
    safety.score = Math.max(0, safety.score);
    return safety;
  }

  determineAction(result) {
    if (!result.safety.safe && result.safety.score < 30) {
      return { type: 'block', reason: 'Critical threat detected', requiresConfirmation: true };
    }
    if (!result.safety.safe) {
      return { type: 'warn', reason: 'Suspicious content detected', requiresConfirmation: true };
    }
    switch (result.type) {
      case 'url': return { type: 'open_url', url: result.parsed.url };
      case 'wifi': return { type: 'connect_wifi', ...result.parsed };
      case 'phone': return { type: 'dial', number: result.parsed.number };
      case 'sms': return { type: 'send_sms', number: result.parsed.number, body: result.parsed.body };
      case 'email': return { type: 'send_email', address: result.parsed.address };
      case 'geo': return { type: 'open_map', lat: result.parsed.lat, lng: result.parsed.lng };
      case 'upi': return { type: 'upi_payment', url: result.parsed.url };
      case 'bitcoin': return { type: 'crypto_address', address: result.parsed.address };
      default: return { type: 'copy', content: result.raw };
    }
  }

  async executeAction(action) {
    try {
      switch (action.type) {
        case 'open_url': await Linking.openURL(action.url); return { success: true };
        case 'dial': await Linking.openURL(`tel:${action.number}`); return { success: true };
        case 'send_sms': await Linking.openURL(`sms:${action.number}?body=${encodeURIComponent(action.body || '')}`); return { success: true };
        case 'send_email': await Linking.openURL(`mailto:${action.address}`); return { success: true };
        case 'open_map': await Linking.openURL(`geo:${action.lat},${action.lng}`); return { success: true };
        case 'upi_payment': await Linking.openURL(action.url); return { success: true };
        default: return { success: true, note: 'No external action needed' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getHistory() {
    return [...this.scanHistory];
  }

  async clearHistory() {
    this.scanHistory = [];
    await AsyncStorage.removeItem('@manu_qr_history');
  }
}

export default new QRIntel();
