// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Panic Password System
// File: src/security/PanicPassword.js
// Generated: 2026-06-25

import AsyncStorage from '@react-native-async-storage/async-storage';

class PanicPassword {
  constructor() {
    this.realPasswordHash = null;
    this.panicPasswordHash = null;
    this.decoyScreen = 'calculator';
    this.enabled = false;
  }

  async init() {
    await this.loadConfig();
    return true;
  }

  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem('@manu_panic_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.enabled = config.enabled || false;
        this.decoyScreen = config.decoyScreen || 'calculator';
        this.realPasswordHash = config.realPasswordHash || null;
        this.panicPasswordHash = config.panicPasswordHash || null;
      }
    } catch (e) {}
  }

  async saveConfig() {
    try {
      await AsyncStorage.setItem('@manu_panic_config', JSON.stringify({
        enabled: this.enabled,
        decoyScreen: this.decoyScreen,
        realPasswordHash: this.realPasswordHash,
        panicPasswordHash: this.panicPasswordHash,
      }));
    } catch (e) {}
  }

  async hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return String(hash);
  }

  async setPasswords(realPassword, panicPassword) {
    if (!realPassword || !panicPassword || realPassword === panicPassword) {
      return { success: false, error: 'Passwords must be different and non-empty' };
    }
    this.realPasswordHash = await this.hashPassword(realPassword);
    this.panicPasswordHash = await this.hashPassword(panicPassword);
    this.enabled = true;
    await this.saveConfig();
    return { success: true };
  }

  async authenticate(inputPassword) {
    if (!this.enabled) return { type: 'normal', granted: true };
    if (!inputPassword) return { type: 'denied', granted: false };

    const inputHash = await this.hashPassword(inputPassword);

    if (inputHash === this.realPasswordHash) {
      return { type: 'normal', granted: true };
    }

    if (inputHash === this.panicPasswordHash) {
      await this.triggerPanicMode();
      return { type: 'panic', granted: true, decoy: this.decoyScreen };
    }

    return { type: 'denied', granted: false };
  }

  async triggerPanicMode() {
    await this.logPanicEvent();
    await this.hideSensitiveData();
    await AsyncStorage.setItem('@manu_show_decoy', 'true');
  }

  async logPanicEvent() {
    try {
      const log = await AsyncStorage.getItem('@manu_panic_log') || '[]';
      const logs = JSON.parse(log);
      logs.push({ timestamp: Date.now(), event: 'panic_activated' });
      await AsyncStorage.setItem('@manu_panic_log', JSON.stringify(logs.slice(-50)));
    } catch (e) {}
  }

  async hideSensitiveData() {
    try {
      await AsyncStorage.setItem('@manu_panic_active', 'true');
      const keys = await AsyncStorage.getAllKeys();
      const sensitive = keys.filter(k => k.includes('vault') || k.includes('secret') || k.includes('password'));
      await AsyncStorage.setItem('@manu_hidden_keys', JSON.stringify(sensitive));
    } catch (e) {}
  }

  async restoreFromPanic() {
    try {
      await AsyncStorage.removeItem('@manu_show_decoy');
      await AsyncStorage.removeItem('@manu_panic_active');
      await AsyncStorage.removeItem('@manu_hidden_keys');
      return { restored: true };
    } catch (e) {
      return { restored: false, error: e.message };
    }
  }

  async isPanicActive() {
    try {
      const val = await AsyncStorage.getItem('@manu_panic_active');
      return val === 'true';
    } catch (e) { return false; }
  }

  async setDecoyScreen(screenType) {
    const validScreens = ['calculator', 'notes', 'weather', 'clock'];
    if (!validScreens.includes(screenType)) {
      return { success: false, error: 'Invalid decoy screen type' };
    }
    this.decoyScreen = screenType;
    await this.saveConfig();
    return { success: true };
  }

  async getConfig() {
    return {
      enabled: this.enabled,
      decoyScreen: this.decoyScreen,
      hasRealPassword: !!this.realPasswordHash,
      hasPanicPassword: !!this.panicPasswordHash,
    };
  }

  async getPanicLog() {
    try {
      const log = await AsyncStorage.getItem('@manu_panic_log');
      return log ? JSON.parse(log) : [];
    } catch (e) { return []; }
  }
}

export default new PanicPassword();
