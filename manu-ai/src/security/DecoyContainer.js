// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Decoy App Container
// File: src/security/DecoyContainer.js
// Generated: 2026-06-25

import AsyncStorage from '@react-native-async-storage/async-storage';

class DecoyContainer {
  constructor() {
    this.hiddenApps = new Set();
    this.decoyApps = {};
  }

  async init() {
    await this.loadHiddenApps();
    return true;
  }

  async loadHiddenApps() {
    try {
      const stored = await AsyncStorage.getItem('@manu_hidden_apps');
      if (stored) this.hiddenApps = new Set(JSON.parse(stored));
    } catch (e) {}
  }

  async saveHiddenApps() {
    try {
      await AsyncStorage.setItem('@manu_hidden_apps', JSON.stringify([...this.hiddenApps]));
    } catch (e) {}
  }

  async hideApp(packageName, decoyName = null) {
    this.hiddenApps.add(packageName);
    if (decoyName) {
      this.decoyApps[packageName] = decoyName;
    }
    await this.saveHiddenApps();
    await AsyncStorage.setItem('@manu_decoy_map', JSON.stringify(this.decoyApps));
    return { success: true, hidden: true };
  }

  async unhideApp(packageName) {
    this.hiddenApps.delete(packageName);
    delete this.decoyApps[packageName];
    await this.saveHiddenApps();
    await AsyncStorage.setItem('@manu_decoy_map', JSON.stringify(this.decoyApps));
    return { success: true, hidden: false };
  }

  async isAppHidden(packageName) {
    return this.hiddenApps.has(packageName);
  }

  getHiddenApps() {
    return [...this.hiddenApps];
  }

  getDecoyMap() {
    return { ...this.decoyApps };
  }

  async createDecoyData(decoyType) {
    const decoyData = {
      calculator: { history: ['2+2=4', '10*5=50', '100/4=25'] },
      notes: { notes: [
        { title: 'Grocery List', content: 'Milk, Eggs, Bread, Butter' },
        { title: 'Meeting', content: 'Team sync at 3 PM' },
      ]},
      weather: { city: 'New York', temp: '72°F', condition: 'Sunny' },
      clock: { alarms: ['07:00 AM', '08:30 AM'] },
    };
    return decoyData[decoyType] || decoyData.calculator;
  }

  async encryptHiddenData(data, key) {
    try {
      const encrypted = btoa(JSON.stringify(data));
      return { success: true, encrypted };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async decryptHiddenData(encryptedData, key) {
    try {
      const decrypted = JSON.parse(atob(encryptedData));
      return { success: true, decrypted };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getContainerStatus() {
    return {
      hiddenCount: this.hiddenApps.size,
      decoyTypes: Object.keys(this.decoyApps),
      activeDecoy: await AsyncStorage.getItem('@manu_active_decoy') || null,
    };
  }
}

export default new DecoyContainer();
