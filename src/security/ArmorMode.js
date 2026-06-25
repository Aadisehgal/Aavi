import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — Digital Armor Mode
// File: src/security/ArmorMode.js
// Generated: 2026-06-25

import { NativeModules, AppState } from 'react-native';


const { SecurityModule, PowerManager } = NativeModules;

class ArmorMode {
  constructor() {
    this.active = false;
    this.intruderAttempts = 0;
    this.lockdownLevel = 0;
    this.appStateSub = null;
  }

  async init() {
    await this.loadState();
    this.watchAppState();
    return true;
  }

  async loadState() {
    try {
      const stored = await AsyncStorage.getItem('@manu_armor_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.intruderAttempts = state.intruderAttempts || 0;
      }
    } catch (e) {}
  }

  async saveState() {
    try {
      await AsyncStorage.setItem('@manu_armor_state', JSON.stringify({
        intruderAttempts: this.intruderAttempts,
        active: this.active,
        lockdownLevel: this.lockdownLevel,
      }));
    } catch (e) {}
  }

  watchAppState() {
    this.appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && this.active) {
        this.enterBackgroundLockdown();
      }
    });
  }

  async activate(level = 1) {
    this.active = true;
    this.lockdownLevel = level;
    const actions = [];

    if (level >= 1) {
      actions.push('screenshot_disabled');
      actions.push('orientation_locked');
      try {
        if (SecurityModule && SecurityModule.disableScreenshots) {
          await SecurityModule.disableScreenshots(true);
        }
      } catch (e) {}
    }

    if (level >= 2) {
      actions.push('clipboard_blocked');
      actions.push('notification_preview_hidden');
      try {
        if (SecurityModule && SecurityModule.setSecureFlag) {
          await SecurityModule.setSecureFlag(true);
        }
        if (SecurityModule && SecurityModule.blockClipboard) {
          await SecurityModule.blockClipboard(true);
        }
      } catch (e) {}
    }

    if (level >= 3) {
      actions.push('clipboard_wiped');
      actions.push('sharing_disabled');
      actions.push('intruder_alert_ready');
      try {
        if (SecurityModule && SecurityModule.wipeClipboard) {
          await SecurityModule.wipeClipboard();
        }
      } catch (e) {}
    }

    await this.saveState();
    return { active: true, level, actions };
  }

  async deactivate() {
    this.active = false;
    this.lockdownLevel = 0;
    try {
      if (SecurityModule && SecurityModule.disableScreenshots) {
        await SecurityModule.disableScreenshots(false);
      }
      if (SecurityModule && SecurityModule.setSecureFlag) {
        await SecurityModule.setSecureFlag(false);
      }
      if (SecurityModule && SecurityModule.blockClipboard) {
        await SecurityModule.blockClipboard(false);
      }
    } catch (e) {}
    await this.saveState();
    return { active: false };
  }

  async enterBackgroundLockdown() {
    if (!this.active) return;
    try {
      if (SecurityModule && SecurityModule.triggerBackgroundLock) {
        await SecurityModule.triggerBackgroundLock();
      }
    } catch (e) {}
  }

  async reportIntruderAttempt() {
    this.intruderAttempts++;
    await this.saveState();
    if (this.intruderAttempts >= 3) {
      await this.activate(3);
      return { escalated: true, level: 3, message: 'Multiple intruder attempts detected. Full lockdown activated.' };
    }
    return { escalated: false, attempts: this.intruderAttempts };
  }

  async resetIntruderCount() {
    this.intruderAttempts = 0;
    await this.saveState();
    return { reset: true };
  }

  isActive() {
    return this.active;
  }

  getLevel() {
    return this.lockdownLevel;
  }
}

export default new ArmorMode();
