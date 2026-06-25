import AsyncStorage from '@react-native-async-storage/async-storage';

// MANU AI — J.A.R.V.I.S. Edition v2.0
// File: src/features/ScreenshotAI.js
// Feature 48 — AI screenshot analyser: OCR + context extraction + Q&A

import { NativeModules} from 'react-native';
import AIManager from '../ai/AIManager';

const { AccessibilityBridgeModule } = NativeModules;
const STORAGE_KEY = '@manu_ai_screenshots';

class ScreenshotAI {
  constructor() {
    this.history = [];
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) this.history = JSON.parse(stored).slice(0, 30);
    } catch (e) { console.warn('[ScreenshotAI] Init:', e); }
  }

  async _save() {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.history.slice(0, 30))); }
    catch (e) { console.warn('[ScreenshotAI] Save:', e); }
  }

  /**
   * Capture the current screen text via accessibility APIs and analyse it with AI.
   * @param {string} question  — optional question to ask about the screen content
   */
  async analyseCurrentScreen(question = 'What is on the screen? Summarise key information.') {
    let screenText = '';

    // Try to get screen content from accessibility service
    try {
      const content = await AccessibilityBridgeModule?.getScreenContent?.();
      screenText = Array.isArray(content?.texts)
        ? content.texts.join('\n')
        : String(content?.text || '');
    } catch (e) {
      console.warn('[ScreenshotAI] Accessibility read failed:', e.message);
    }

    if (!screenText) {
      return { success: false, error: 'Could not read screen content. Ensure Accessibility Service is enabled.' };
    }

    // Ask AI to analyse
    const prompt = `The following text was captured from the current screen:\n\n---\n${screenText.slice(0, 3000)}\n---\n\nUser question: ${question}\n\nProvide a concise, helpful response.`;

    let aiResponse = '';
    try {
      aiResponse = await AIManager.complete(prompt);
    } catch (e) {
      aiResponse = `AI error: ${e.message}`;
    }

    const entry = {
      id:          String(Date.now()),
      ts:          new Date().toISOString(),
      screenText:  screenText.slice(0, 500),
      question,
      answer:      aiResponse,
    };
    this.history.unshift(entry);
    await this._save();
    return { success: true, ...entry };
  }

  /**
   * Ask a follow-up question about the last captured screen.
   */
  async askAboutLastScreen(question) {
    const last = this.history[0];
    if (!last) return { success: false, error: 'No previous screen capture found.' };

    const prompt = `Screen content:\n${last.screenText}\n\nPrevious Q: ${last.question}\nPrevious A: ${last.answer}\n\nNew question: ${question}`;
    const answer = await AIManager.complete(prompt);
    return { success: true, answer, basedOn: last.ts };
  }

  getHistory(limit = 10) { return this.history.slice(0, limit); }
  clearHistory()          { this.history = []; this._save(); }
}

export default new ScreenshotAI();
