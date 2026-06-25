// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/VoiceTranscribe.js
// Feature 46 — Real-time voice transcription using Whisper / on-device STT

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { WakeWordModule } = NativeModules;
const STORAGE_KEY = '@manu_ai_transcripts';

class VoiceTranscribe {
  constructor() {
    this.isRecording   = false;
    this.transcripts   = [];
    this.currentText   = '';
    this.onPartial     = null;
    this.onFinal       = null;
    this.emitter       = WakeWordModule ? new NativeEventEmitter(WakeWordModule) : null;
    this._listeners    = [];
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) this.transcripts = JSON.parse(stored).slice(0, 50);
    } catch (e) { console.warn('[VoiceTranscribe] Init:', e); }

    // Listen for partial results from the native wake-word/STT module
    if (this.emitter) {
      this._listeners.push(
        this.emitter.addListener('onVoicePartial', ({ text }) => {
          this.currentText = text;
          this.onPartial?.(text);
        }),
        this.emitter.addListener('onVoiceFinal', ({ text }) => {
          this.currentText = '';
          this._saveTranscript(text);
          this.onFinal?.(text);
        })
      );
    }
  }

  async _saveTranscript(text) {
    const entry = { id: String(Date.now()), text, ts: new Date().toISOString() };
    this.transcripts.unshift(entry);
    this.transcripts = this.transcripts.slice(0, 50);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.transcripts)); }
    catch (e) { console.warn('[VoiceTranscribe] Save:', e); }
    return entry;
  }

  async startRecording(opts = {}) {
    if (this.isRecording) return;
    this.isRecording = true;
    this.onPartial   = opts.onPartial || null;
    this.onFinal     = opts.onFinal   || null;
    try {
      await WakeWordModule?.startListening?.();
    } catch (e) {
      this.isRecording = false;
      throw e;
    }
  }

  async stopRecording() {
    if (!this.isRecording) return null;
    this.isRecording = false;
    try {
      const result = await WakeWordModule?.stopListening?.();
      const text   = result?.text || this.currentText || '';
      if (text) return this._saveTranscript(text);
    } catch (e) { console.warn('[VoiceTranscribe] Stop error:', e); }
    return null;
  }

  getTranscripts(limit = 20) { return this.transcripts.slice(0, limit); }
  clearTranscripts()          { this.transcripts = []; AsyncStorage.removeItem(STORAGE_KEY).catch(() => {}); }

  destroy() {
    this._listeners.forEach(l => l.remove());
    this._listeners = [];
  }
}

export default new VoiceTranscribe();
