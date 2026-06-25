import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Contextual Memory Stack)
// File: src/features/MemoryStack.js
// Generated: 2026-06-24



const MEMORY_KEY = '@manu_ai_memory_stack';
const SESSION_KEY = '@manu_ai_current_session';
const MAX_STACK_DEPTH = 50;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

class MemoryStack {
  constructor() {
    this.stack = [];
    this.sessionContext = {};
    this.currentSessionId = null;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(MEMORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.stack = parsed.stack || [];
      }
      const session = await AsyncStorage.getItem(SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        const now = Date.now();
        if (now - parsed.lastActive < SESSION_TIMEOUT_MS) {
          this.currentSessionId = parsed.sessionId;
          this.sessionContext = parsed.context || {};
        } else {
          await this._archiveSession(parsed);
          await this.startNewSession();
        }
      } else {
        await this.startNewSession();
      }
    } catch (e) {
      console.warn('[MemoryStack] Init error:', e);
      await this.startNewSession();
    }
  }

  async startNewSession() {
    this.currentSessionId = this._generateSessionId();
    this.sessionContext = {
      startedAt: new Date().toISOString(),
      topics: [],
      pendingQuestions: [],
      userMood: null,
      lastLocation: null,
      activeTask: null,
    };
    await this._persistSession();
  }

  async pushContext(frame) {
    const entry = {
      id: this._generateId(),
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
      type: frame.type || 'general',
      content: frame.content,
      metadata: frame.metadata || {},
      importance: frame.importance || 1,
    };
    this.stack.unshift(entry);
    if (frame.type === 'topic') {
      this.sessionContext.topics.unshift(frame.content);
      this.sessionContext.topics = this.sessionContext.topics.slice(0, 10);
    }
    if (frame.type === 'question') {
      this.sessionContext.pendingQuestions.push({
        id: entry.id,
        question: frame.content,
        timestamp: entry.timestamp,
      });
    }
    if (frame.type === 'task') {
      this.sessionContext.activeTask = {
        id: entry.id,
        description: frame.content,
        status: 'active',
      };
    }
    if (this.stack.length > MAX_STACK_DEPTH) {
      this.stack = this.stack.slice(0, MAX_STACK_DEPTH);
    }
    await this._persistStack();
    await this._persistSession();
    return entry.id;
  }

  async getRelevantContext(query, maxResults = 5) {
    const queryLower = (query || '').toLowerCase();
    const relevant = [];
    for (const frame of this.stack) {
      let score = 0;
      const contentLower = (frame.content || '').toLowerCase();
      if (contentLower.includes(queryLower)) score += 3;
      if (this.sessionContext.topics.some(t => queryLower.includes(t.toLowerCase()))) score += 2;
      if (frame.sessionId === this.currentSessionId) score += 1;
      score += frame.importance * 0.5;
      if (score > 0) relevant.push({ ...frame, relevanceScore: score });
    }
    relevant.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return relevant.slice(0, maxResults);
  }

  async getContinuePrompt() {
    const pending = this.sessionContext.pendingQuestions;
    if (pending.length > 0) {
      const lastPending = pending[pending.length - 1];
      return {
        hasContext: true,
        prompt: `You had asked about "${lastPending.question}". Would you like me to continue with that?`,
        pendingId: lastPending.id,
      };
    }
    const activeTask = this.sessionContext.activeTask;
    if (activeTask && activeTask.status === 'active') {
      return {
        hasContext: true,
        prompt: `You were working on "${activeTask.description}". Should I resume that?`,
        taskId: activeTask.id,
      };
    }
    const recentTopics = this.sessionContext.topics.slice(0, 3);
    if (recentTopics.length > 0) {
      return {
        hasContext: true,
        prompt: `We were discussing ${recentTopics.join(', ')}. What would you like to know next?`,
      };
    }
    return { hasContext: false, prompt: null };
  }

  async resolveQuestion(questionId) {
    this.sessionContext.pendingQuestions = this.sessionContext.pendingQuestions.filter(
      q => q.id !== questionId
    );
    await this._persistSession();
  }

  async completeTask(taskId) {
    if (this.sessionContext.activeTask && this.sessionContext.activeTask.id === taskId) {
      this.sessionContext.activeTask.status = 'completed';
      await this._persistSession();
    }
  }

  async getSessionHistory() {
    return this.stack.filter(frame => frame.sessionId === this.currentSessionId);
  }

  async searchMemories(keyword) {
    const keywordLower = keyword.toLowerCase();
    return this.stack.filter(frame => (frame.content || '').toLowerCase().includes(keywordLower));
  }

  async updateSessionContext(key, value) {
    this.sessionContext[key] = value;
    this.sessionContext.lastActive = new Date().toISOString();
    await this._persistSession();
  }

  async clearAll() {
    this.stack = [];
    this.sessionContext = {};
    this.currentSessionId = null;
    await AsyncStorage.multiRemove([MEMORY_KEY, SESSION_KEY]);
  }

  async _persistStack() {
    try {
      await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify({
        stack: this.stack,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[MemoryStack] Persist error:', e);
    }
  }

  async _persistSession() {
    try {
      this.sessionContext.lastActive = new Date().toISOString();
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId: this.currentSessionId,
        context: this.sessionContext,
        lastActive: Date.now(),
      }));
    } catch (e) {
      console.warn('[MemoryStack] Session persist error:', e);
    }
  }

  async _archiveSession(sessionData) {
    const archiveKey = '@manu_ai_session_archive';
    try {
      const stored = await AsyncStorage.getItem(archiveKey);
      const archive = stored ? JSON.parse(stored) : [];
      archive.push({ ...sessionData, archivedAt: new Date().toISOString() });
      if (archive.length > 20) archive.shift();
      await AsyncStorage.setItem(archiveKey, JSON.stringify(archive));
    } catch (e) {
      console.warn('[MemoryStack] Archive error:', e);
    }
  }

  _generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateId() {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new MemoryStack();
