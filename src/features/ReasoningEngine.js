// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/ReasoningEngine.js
// Generated: 2026-06-24

import AsyncStorage from '@react-native-async-storage/async-storage';

const REASONING_KEY = '@manu_ai_reasoning_sessions';
const MAX_SESSIONS = 50;
const MAX_TURNS_PER_SESSION = 10;

class ReasoningEngine {
  constructor() {
    this.sessions = [];
    this.activeSession = null;
    this.loadSessions();
  }

  async loadSessions() {
    try {
      const data = await AsyncStorage.getItem(REASONING_KEY);
      if (data !== null) {
        this.sessions = JSON.parse(data);
      }
    } catch (e) {
      console.warn('ReasoningEngine load error:', e);
    }
  }

  async saveSessions() {
    try {
      await AsyncStorage.setItem(REASONING_KEY, JSON.stringify(this.sessions.slice(-MAX_SESSIONS)));
    } catch (e) {
      console.warn('ReasoningEngine save error:', e);
    }
  }

  startSession(context = {}) {
    this.activeSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
      turns: [],
      context: { ...context },
      resolved: false,
      conclusion: null,
    };
    return this.activeSession.id;
  }

  endSession(conclusion = null) {
    if (!this.activeSession) return null;
    this.activeSession.endedAt = Date.now();
    this.activeSession.resolved = true;
    this.activeSession.conclusion = conclusion;
    this.sessions.push(this.activeSession);
    if (this.sessions.length > MAX_SESSIONS) {
      this.sessions.shift();
    }
    const session = this.activeSession;
    this.activeSession = null;
    this.saveSessions();
    return session;
  }

  addTurn(userInput, intent, entities = {}, confidence = 1.0) {
    if (!this.activeSession) {
      this.startSession();
    }
    const turn = {
      turnIndex: this.activeSession.turns.length + 1,
      timestamp: Date.now(),
      userInput,
      intent,
      entities,
      confidence,
      inferredGoal: this.inferGoal(userInput, intent, entities),
      missingInfo: this.identifyMissingInfo(intent, entities),
    };
    this.activeSession.turns.push(turn);
    if (this.activeSession.turns.length > MAX_TURNS_PER_SESSION) {
      this.activeSession.turns.shift();
    }
    return turn;
  }

  inferGoal(input, intent, entities) {
    const goals = {
      call: entities.contact ? `Call ${entities.contact}` : 'Make a phone call',
      message: entities.contact && entities.messageBody
        ? `Message ${entities.contact}: "${entities.messageBody}"`
        : entities.contact
        ? `Message ${entities.contact}`
        : 'Send a message',
      alarm: entities.time ? `Set alarm for ${entities.time}` : 'Set an alarm',
      navigate: entities.location ? `Navigate to ${entities.location}` : 'Get directions',
      weather: entities.location ? `Weather in ${entities.location}` : 'Get weather',
      music: entities.song ? `Play ${entities.song}` : 'Play music',
      search: entities.query ? `Search for "${entities.query}"` : 'Search the web',
      schedule: entities.time && entities.contact
        ? `Schedule meeting with ${entities.contact} at ${entities.time}`
        : 'Schedule an event',
      settings: entities.setting ? `Adjust ${entities.setting}` : 'Change settings',
    };
    return goals[intent] || 'General assistance';
  }

  identifyMissingInfo(intent, entities) {
    const required = {
      call: ['contact'],
      message: ['contact'],
      alarm: ['time'],
      navigate: ['location'],
      weather: [],
      music: [],
      search: ['query'],
      schedule: ['time'],
      settings: ['setting'],
    };
    const needed = required[intent] || [];
    return needed.filter(k => !entities[k]);
  }

  getSessionContext() {
    if (!this.activeSession || this.activeSession.turns.length === 0) {
      return {};
    }
    const lastTurn = this.activeSession.turns[this.activeSession.turns.length - 1];
    const allIntents = this.activeSession.turns.map(t => t.intent);
    const dominantIntent = this.getMode(allIntents);
    return {
      lastIntent: lastTurn.intent,
      lastEntities: lastTurn.entities,
      dominantIntent,
      turnCount: this.activeSession.turns.length,
      unresolvedMissing: lastTurn.missingInfo,
      sessionDuration: Date.now() - this.activeSession.startedAt,
    };
  }

  getMode(arr) {
    const counts = {};
    let max = 0;
    let mode = null;
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > max) {
        max = counts[item];
        mode = item;
      }
    });
    return mode;
  }

  shouldClarify() {
    if (!this.activeSession || this.activeSession.turns.length === 0) return false;
    const last = this.activeSession.turns[this.activeSession.turns.length - 1];
    return last.missingInfo.length > 0 || last.confidence < 0.7;
  }

  generateClarification() {
    if (!this.activeSession) return null;
    const last = this.activeSession.turns[this.activeSession.turns.length - 1];
    if (!last || last.missingInfo.length === 0) return null;

    const prompts = {
      contact: 'Who would you like to contact?',
      time: 'What time should I set?',
      location: 'Where exactly should I navigate to?',
      query: 'What would you like me to search for?',
      setting: 'Which setting would you like to adjust?',
      messageBody: 'What should the message say?',
      song: 'Which song or artist would you like to play?',
    };

    const missing = last.missingInfo[0];
    return prompts[missing] || `Could you provide more details about ${missing}?`;
  }

  getActiveSession() {
    return this.activeSession;
  }

  getAllSessions() {
    return this.sessions;
  }

  getSessionById(id) {
    return this.sessions.find(s => s.id === id) || null;
  }

  clearAllSessions() {
    this.sessions = [];
    this.activeSession = null;
    this.saveSessions();
  }
}

export default new ReasoningEngine();
