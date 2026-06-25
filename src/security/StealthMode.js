// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Stealth Mode
// File: src/security/StealthMode.js
// Generated: 2026-06-25

import { NativeModules, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SecurityModule, LauncherModule } = NativeModules;

class StealthMode {
  constructor() {
    this.active = false;
    this.hideFromRecents = false;
    this.silentNotifications = false;
  }

  async init() {
    await this.loadState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_stealth_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.active = state.active || false;
        this.hideFromRecents = state.hideFromRecents || false;
        this.silentNotifications = state.silentNotifications || false;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_stealth_state', JSON.stringify({
        active: this.active,
        hideFromRecents: this.hideFromRecents,
        silentNotifications: this.silentNotifications,
      }));
    } catch (e) {}
  }

  async activate(options = {}) {
    this.active = true;
    this.hideFromRecents = options.hideFromRecents !== false;
    this.silentNotifications = options.silentNotifications !== false;
    try {
      if (SecurityModule && SecurityModule.setStealthMode) {
        await SecurityModule.setStealthMode(true);
      }
      if (this.hideFromRecents && LauncherModule && LauncherModule.hideFromRecents) {
        await LauncherModule.hideFromRecents(true);
      }
    } catch (e) {}
    await this.saveState();
    return { active: true, hideFromRecents: this.hideFromRecents, silentNotifications: this.silentNotifications };
  }

  async deactivate() {
    this.active = false;
    try {
      if (SecurityModule && SecurityModule.setStealthMode) {
        await SecurityModule.setStealthMode(false);
      }
      if (LauncherModule && LauncherModule.hideFromRecents) {
        await LauncherModule.hideFromRecents(false);
      }
    } catch (e) {}
    await this.saveState();
    return { active: false };
  }

  async hideAppIcon() {
    try {
      if (LauncherModule && LauncherModule.hideAppIcon) {
        await LauncherModule.hideAppIcon();
        return { success: true, hidden: true };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'LauncherModule unavailable' };
  }

  async showAppIcon() {
    try {
      if (LauncherModule && LauncherModule.showAppIcon) {
        await LauncherModule.showAppIcon();
        return { success: true, hidden: false };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'LauncherModule unavailable' };
  }

  async setAlias(aliasName) {
    try {
      if (LauncherModule && LauncherModule.setAlias) {
        await LauncherModule.setAlias(aliasName);
        return { success: true, alias: aliasName };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'LauncherModule unavailable' };
  }

  isActive() {
    return this.active;
  }

  async getStatus() {
    return { active: this.active, hideFromRecents: this.hideFromRecents, silentNotifications: this.silentNotifications };
  }
}

export default new StealthMode();
