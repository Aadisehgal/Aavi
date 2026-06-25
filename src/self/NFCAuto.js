// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 18/20 — NFC Tag Automation
// File: src/self/NFCAuto.js
// Generated: 2026-06-25

import { NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { NFCModule } = NativeModules;
const nfcEmitter = NFCModule ? new NativeEventEmitter(NFCModule) : null;

class NFCAuto {
  constructor() {
    this.triggers = {};
    this.isListening = false;
    this.subscription = null;
  }

  async init() {
    await this.loadTriggers();
    return true;
  }

  async loadTriggers() {
    try {
      const stored = await AsyncStorage.getItem('@manu_nfc_triggers');
      if (stored) this.triggers = JSON.parse(stored);
    } catch (e) {}
  }

  async saveTriggers() {
    try {
      await AsyncStorage.setItem('@manu_nfc_triggers', JSON.stringify(this.triggers));
    } catch (e) {}
  }

  async isAvailable() {
    try {
      if (!NFCModule || !NFCModule.isAvailable) return { available: false, error: 'NFCModule unavailable' };
      return await NFCModule.isAvailable();
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  async startListening() {
    if (this.isListening) return { success: true, alreadyListening: true };
    try {
      if (!NFCModule || !NFCModule.startListening) {
        return { success: false, error: 'NFCModule unavailable' };
      }
      await NFCModule.startListening();
      this.isListening = true;
      if (nfcEmitter) {
        this.subscription = nfcEmitter.addListener('NFC_TAG_DISCOVERED', (event) => {
          this.handleTag(event);
        });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async stopListening() {
    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      if (NFCModule && NFCModule.stopListening) {
        await NFCModule.stopListening();
      }
      this.isListening = false;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async handleTag(event) {
    const tagId = event.id || event.tagId || 'unknown';
    const tech = event.tech || [];
    const payload = event.payload || event.ndefMessage || [];
    const trigger = this.triggers[tagId];
    if (trigger) {
      await this.executeTrigger(trigger, { tagId, tech, payload });
    }
    await this.logTap(tagId, tech, payload);
  }

  async executeTrigger(trigger, context) {
    switch (trigger.action) {
      case 'toggle_wifi': break;
      case 'toggle_bluetooth': break;
      case 'launch_app': break;
      case 'run_command': break;
      case 'send_message': break;
      case 'change_profile': break;
      case 'open_url': break;
      default: break;
    }
  }

  async logTap(tagId, tech, payload) {
    try {
      const log = await AsyncStorage.getItem('@manu_nfc_log') || '[]';
      const logs = JSON.parse(log);
      logs.push({ timestamp: Date.now(), tagId, tech, payloadSize: JSON.stringify(payload).length });
      await AsyncStorage.setItem('@manu_nfc_log', JSON.stringify(logs.slice(-200)));
    } catch (e) {}
  }

  async registerTrigger(tagId, action, options = {}) {
    this.triggers[tagId] = { action, options, createdAt: Date.now() };
    await this.saveTriggers();
    return { success: true, tagId, action };
  }

  async removeTrigger(tagId) {
    delete this.triggers[tagId];
    await this.saveTriggers();
    return { success: true };
  }

  getTriggers() {
    return { ...this.triggers };
  }

  async getTapLog() {
    try {
      const log = await AsyncStorage.getItem('@manu_nfc_log');
      return log ? JSON.parse(log) : [];
    } catch (e) { return []; }
  }

  async writeTag(tagId, data) {
    try {
      if (!NFCModule || !NFCModule.writeTag) {
        return { success: false, error: 'NFCModule unavailable' };
      }
      return await NFCModule.writeTag({ tagId, data });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async readTag() {
    try {
      if (!NFCModule || !NFCModule.readTag) {
        return { success: false, error: 'NFCModule unavailable' };
      }
      return await NFCModule.readTag();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export default new NFCAuto();
